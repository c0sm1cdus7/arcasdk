/**
 * Register DTOs
 * Data Transfer Objects for register/padron operations
 * These DTOs are independent of infrastructure concerns
 */

/**
 * Server Status DTO (for Register services)
 */
export interface RegisterServerStatusDto {
    appserver: string;
    dbserver: string;
    authserver: string;
}

export interface TaxDto {
    descripcionImpuesto: string;
    estadoImpuesto: string;
    idImpuesto: number;
    motivo: string;
    periodo: number;
}

export interface ActivityDto {
    descripcionActividad: string;
    idActividad: number;
    nomenclador: number;
    orden: number;
    periodo: number;
}

export interface RegimeDto {
    descripcionRegimen: string;
    idImpuesto: number;
    idRegimen: number;
    periodo: number;
    tipoRegimen: string;
}

/**
 * Taxpayer Details DTO
 */
export interface TaxpayerDetailsDto {
    idPersona?: number;
    tipoPersona?: string;
    estadoClave?: string;
    datosGenerales?: {
        idPersona?: number;
        tipoPersona?: string;
        tipoClave?: string;
        estadoClave?: string;
        razonSocial?: string;
        nombre?: string;
        apellido?: string;
        domicilioFiscal?: {
            codPostal?: string;
            descripcionProvincia?: string;
            direccion?: string;
            idProvincia?: number;
            localidad?: string;
            tipoDomicilio?: string;
        }[];
        mesCierre?: number;
        esSucesion?: string;
        formaJuridica?: string;
        fechaContratoSocial?: number;
        idActividadPrincipal?: number;
        periodoActividadPrincipal?: number;
        descripcionActividadPrincipal?: string;
        domicilio: {
            direccion?: string;
            calle?: string;
            numero?: number;
            codPostal?: string;
            localidad?: string;
            tipoDomicilio?: string;
            idProvincia?: number;
            descripcionProvincia?: string;
            estadoDomicilio?: string;
        }[];
        [key: string]: any;
    };
    datosMonotributo?: {
        actividad: ActivityDto[];
        actividadMonotributista: ActivityDto;
        categoriaMonotributo: {
            descripcionCategoria: string;
            idCategoria: number;
            idImpuesto: number;
            periodo: number;
        };
        impuesto: TaxDto[];
    };
    datosRegimenGeneral?: {
        actividad: ActivityDto[];
        impuesto: TaxDto[];
        regimen: RegimeDto[];
    };
    errorConstancia?: {
        error?: string;
        codigo?: number;
    };
    [key: string]: any;
}

/**
 * Taxpayers Details DTO (for multiple taxpayers)
 */
export interface TaxpayersDetailsDto {
    persona?: TaxpayerDetailsDto[];
    cantidadRegistros?: number;
    errorConstancia?: {
        error?: string;
        codigo?: number;
    };
    [key: string]: any;
}

/**
 * Tax ID by Document Result DTO
 */
export interface TaxIDByDocumentResultDto {
    idPersona?: number[];
    errorConstancia?: {
        error?: string;
        codigo?: number;
    };
    [key: string]: any;
}

/**
 * Register Service Result DTOs
 * These DTOs represent the return types for register services
 * They maintain compatibility with legacy API while being independent of SOAP types
 */

/**
 * Register Server Status Result DTO
 */
export interface RegisterServerStatusResultDto {
    appserver: string;
    dbserver: string;
    authserver: string;
}

/**
 * Register Taxpayer Details Result DTO
 * Wraps TaxpayerDetailsDto with metadata for compatibility
 */
export interface RegisterTaxpayerDetailsResultDto {
    metadata?: {
        fechaHora?: string;
        servidor?: string;
    };
    persona?: TaxpayerDetailsDto;
    datosGenerales?: TaxpayerDetailsDto["datosGenerales"];
    datosMonotributo?: TaxpayerDetailsDto["datosMonotributo"];
    datosRegimenGeneral?: TaxpayerDetailsDto["datosRegimenGeneral"];
    errorConstancia?: TaxpayerDetailsDto["errorConstancia"];
    errorMonotributo?: any;
    errorRegimenGeneral?: any;
}

/**
 * Register Taxpayers List Result DTO
 */
export interface RegisterTaxpayersListResultDto {
    metadata?: {
        fechaHora?: string;
        servidor?: string;
    };
    persona?: TaxpayerDetailsDto[];
    cantidadRegistros?: number;
    errorConstancia?: {
        error?: string;
        codigo?: number;
    };
}

/**
 * Register Tax ID by Document Result DTO
 */
export interface RegisterTaxIDByDocumentResultDto {
    idPersona?: number;
    metadata?: {
        fechaHora?: string;
        servidor?: string;
    };
}
