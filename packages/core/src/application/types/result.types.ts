/**
 * Application Types - Results
 * Types for application service results
 */
import { ServiceSoap12Types } from "@infrastructure/outbound/ports/soap/interfaces/Service/ServiceSoap12";
import { ErrorInfo } from "@domain/types/electronic-billing.types";

export interface ICreateVoucherResult {
  response: ServiceSoap12Types.IFECAESolicitarResult;
  cae: string;
  caeFchVto: string;
  /** ARCA authorization result for the detail line: "A" (approved), "R" (rejected), "P" (partial). */
  resultado?: string;
  /**
   * Observaciones returned by ARCA for the comprobante. When `resultado` is "R" these are the
   * reasons the voucher was rejected; on "A" they are non-blocking remarks. Empty/undefined when none.
   */
  observaciones?: ErrorInfo[];
}
