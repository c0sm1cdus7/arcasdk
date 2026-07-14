/**
 * Authentication Repository
 * Implements IAuthenticationRepositoryPort for WSAA authentication
 */
import { IAuthenticationRepositoryPort } from "@application/ports/authentication/authentication-repository.port";
import {
  AccessTicket,
  ILoginCredentials,
} from "@domain/entities/access-ticket.entity";
import { WSAuthParam } from "@application/types";
import { Parser } from "@infrastructure/utils/parser";
import { Cryptography } from "@infrastructure/utils/crypt-data";
import {
  ILoginCmsSoap,
  IloginCmsOutput,
  LoginTicketResponse,
} from "@infrastructure/outbound/ports/soap/interfaces/LoginCMSService/LoginCms";
import { WsdlPathEnum } from "@infrastructure/outbound/ports/soap/enums/wsdl-path.enum";
import { EndpointsEnum } from "@infrastructure/outbound/ports/soap/enums/endpoints.enum";
import { AuthRepositoryConfig } from "@infrastructure/outbound/ports/auth/auth-repository.types";
import { ISoapClientPort } from "@infrastructure/outbound/ports/soap/soap-client.port";
import { ITicketStoragePort } from "@infrastructure/outbound/ports/storage/ticket-storage.port";
import { SoapClient } from "../soap/soap-client";
import { DEFAULT_USE_HTTPS_AGENT } from "@infrastructure/constants";

export class AuthRepository implements IAuthenticationRepositoryPort {
  private cert: string;
  private key: string;
  private production: boolean;
  private handleTicket: boolean;
  private ticketStorage?: ITicketStoragePort;
  private manualCredentials?: ILoginCredentials;

  /** In-flight WSAA logins keyed by service name, to dedup concurrent cold logins. */
  private readonly inFlightLogins = new Map<string, Promise<AccessTicket>>();
  /** Last uniqueId handed to a TRA, kept monotonic to avoid same-second collisions. */
  private lastUniqueId = 0;

  private readonly soapClient: ISoapClientPort;

  constructor(config: AuthRepositoryConfig) {
    this.soapClient =
      config.soapClient ??
      new SoapClient(config.useHttpsAgent ?? DEFAULT_USE_HTTPS_AGENT);
    this.cert = config.cert;
    this.key = config.key;
    this.production = config.production ?? false;
    this.handleTicket = config.handleTicket ?? false;
    this.ticketStorage = config.ticketStorage;
    this.manualCredentials = config.credentials;
  }

  /**
   * Get a valid ticket from storage if available
   * @param serviceName Service name to get ticket for
   * @returns AccessTicket if found and valid, null otherwise
   */
  private async getValidTicketFromStorage(
    serviceName: string
  ): Promise<AccessTicket | null> {
    if (!this.ticketStorage) return null;

    const existingTicket = await this.ticketStorage.get(serviceName);
    if (existingTicket && !existingTicket.isExpired()) return existingTicket;

    return null;
  }

  /**
   * Login and get access ticket for a service
   * @param serviceName Service name to authenticate for
   * @returns AccessTicket
   */
  async login(serviceName: string): Promise<AccessTicket> {
    // If handleTicket is true and we have manual credentials, use them directly
    if (this.handleTicket && this.manualCredentials) {
      return AccessTicket.create(this.manualCredentials);
    }

    // requestLogin already checks storage first, so no redundant read here.
    return this.requestLogin(serviceName);
  }

  /**
   * Create and configure WSAA SOAP client
   */
  private async createAuthClient(): Promise<ILoginCmsSoap> {
    const client = await this.soapClient.createClient<ILoginCmsSoap>(
      WsdlPathEnum.WSAA,
      { disableCache: true }
    );
    this.soapClient.setEndpoint(
      client,
      this.production ? EndpointsEnum.WSAA : EndpointsEnum.WSAA_TEST
    );
    return client;
  }

  /**
   * Request a new login ticket for a service
   * @param serviceName Service name to authenticate for
   * @returns AccessTicket
   */
  async requestLogin(serviceName: string): Promise<AccessTicket> {
    const existingTicket = await this.getValidTicketFromStorage(serviceName);
    if (existingTicket) return existingTicket;

    // Deduplicate concurrent cold logins for the same service. WSAA rejects a second TRA while
    // the first is still valid ("El CEE ya posee un TA vigente"), and this also avoids racing
    // writes to the ticket storage. Concurrent callers await the same in-flight request.
    const inFlight = this.inFlightLogins.get(serviceName);
    if (inFlight) return inFlight;

    const loginPromise = this.performLogin(serviceName);
    this.inFlightLogins.set(serviceName, loginPromise);
    try {
      return await loginPromise;
    } finally {
      this.inFlightLogins.delete(serviceName);
    }
  }

  /**
   * Perform the actual WSAA loginCms round-trip and persist the resulting ticket.
   */
  private async performLogin(serviceName: string): Promise<AccessTicket> {
    const signedTRA = this.signTRA(
      await Parser.jsonToXml(this.getTRA(serviceName))
    );

    const client = await this.createAuthClient();

    const [{ loginCmsReturn }] = await this.soapClient.call<
      [IloginCmsOutput, string, { [k: string]: any }, string]
    >(client, "loginCmsAsync", { in0: signedTRA });

    const ticket = AccessTicket.create(
      (await Parser.xmlToJson<LoginTicketResponse>(loginCmsReturn))
        .loginticketresponse
    );

    if (!this.handleTicket && this.ticketStorage) {
      await this.ticketStorage.save(ticket, serviceName);
    }

    return ticket;
  }

  /**
   * Get authentication parameters formatted for SOAP requests
   * @param ticket Access ticket
   * @param cuit CUIT number
   * @returns WSAuthParam formatted for SOAP
   */
  getAuthParams(ticket: AccessTicket, cuit: number): WSAuthParam {
    return ticket.getWSAuthFormat(cuit);
  }

  /**
   * Create TRA (Token Request Authorization) JSON
   * @param serviceName Service name to create TRA for
   * @returns TRA JSON
   */
  private getTRA(serviceName: string) {
    const date = new Date();
    return {
      loginTicketRequest: {
        $: { version: "1.0" },
        header: [
          {
            uniqueId: [this.nextUniqueId()],
            generationTime: [new Date(date.getTime() - 600000).toISOString()],
            expirationTime: [new Date(date.getTime() + 600000).toISOString()],
          },
        ],
        service: [serviceName],
      },
    };
  }

  /**
   * Monotonic uniqueId for the TRA. Seconds-resolution timestamps collide when two TRAs are
   * generated within the same second; bumping past the last value guarantees uniqueness within
   * the process while staying inside WSAA's unsignedInt range for decades.
   */
  private nextUniqueId(): number {
    const now = Math.floor(Date.now() / 1000);
    this.lastUniqueId = Math.max(now, this.lastUniqueId + 1);
    return this.lastUniqueId;
  }

  /**
   * Sign TRA (Token Request Authorization) XML
   * @param traXml TRA XML to sign
   * @returns Signed TRA XML
   */
  private signTRA(traXml: string): string {
    const crypto = new Cryptography(this.cert, this.key);
    return crypto.sign(traXml);
  }
}
