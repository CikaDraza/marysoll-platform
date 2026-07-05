import "server-only";

type ZohoStatus = {
  code?: number;
  description?: string;
};

type ZohoResponse<T> = {
  status?: ZohoStatus;
  data?: T;
};

type ZohoArrayErrorResponse = [
  number,
  {
    msg?: string;
    errorCode?: string;
    authFail?: string;
    status?: string;
  },
];

export type ZohoOrganizationDetails = {
  zoid?: number | string;
  orgName?: string;
  primaryDomainName?: string;
  domains?: string[];
  isEmailConfirmed?: boolean;
  isMailHostingEnabled?: boolean;
  superAdmin?: string;
};

export type ZohoDomainDetails = {
  domainName?: string;
  verificationStatus?: boolean;
  isVerified?: boolean;
  isDomainVerified?: boolean;
  primary?: boolean;
  mxStatus?: boolean;
  spfStatus?: boolean;
  dkimStatus?: boolean;
  mailHostingStatus?: boolean;
};

type ZohoMailAccountEmailAddress = {
  mailId?: string;
  isAlias?: boolean;
  isPrimary?: boolean;
  isConfirmed?: boolean;
};

type ZohoMailAccount = {
  primaryEmailAddress?: string;
  mailboxAddress?: string;
  emailAliases?: string[];
  emailAddress?: ZohoMailAccountEmailAddress[];
};

export type ZohoVerificationStatus = {
  account: {
    verified: boolean;
    mailHostingEnabled: boolean;
    organizationId: string | null;
    organizationName: string | null;
    primaryDomain: string | null;
    superAdmin: string | null;
  };
  domain: {
    requestedDomain: string;
    found: boolean;
    verified: boolean;
    primary: boolean;
    mailHostingEnabled: boolean | null;
    details: ZohoDomainDetails | null;
  };
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

async function getZohoAccessToken(refreshToken = process.env.ZOHO_REFRESH_TOKEN) {
  const token = refreshToken ?? getRequiredEnv("ZOHO_REFRESH_TOKEN");
  const res = await fetch(`${getRequiredEnv("ZOHO_ACCOUNTS_BASE_URL")}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getRequiredEnv("ZOHO_CLIENT_ID"),
      client_secret: getRequiredEnv("ZOHO_CLIENT_SECRET"),
      refresh_token: token,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho token error: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

function isZohoArrayError(data: unknown): data is ZohoArrayErrorResponse {
  return (
    Array.isArray(data) &&
    typeof data[1] === "object" &&
    data[1] !== null &&
    "errorCode" in data[1]
  );
}

function getZohoApiErrorMessage(data: unknown): string {
  if (isZohoArrayError(data)) {
    const errorCode = data[1].errorCode ?? "UNKNOWN";
    if (errorCode === "INVALID_OAUTHSCOPE") {
      return "Zoho token nema potreban OAuth scope za ovaj API poziv. Regenerišite refresh token sa odgovarajućim Zoho Mail scope-ovima.";
    }
    return data[1].msg ?? errorCode;
  }

  return JSON.stringify(data);
}

async function zohoMailRequest<T>(
  path: string,
  options?: {
    refreshToken?: string;
  },
): Promise<T> {
  const accessToken = await getZohoAccessToken(options?.refreshToken);
  const res = await fetch(`${getRequiredEnv("ZOHO_MAIL_BASE_URL")}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });

  const data = (await res.json()) as ZohoResponse<T> | ZohoArrayErrorResponse;

  if (
    !res.ok ||
    isZohoArrayError(data) ||
    (!Array.isArray(data) && data.status?.code && data.status.code >= 400)
  ) {
    throw new Error(`Zoho Mail API error: ${getZohoApiErrorMessage(data)}`);
  }

  return data.data as T;
}

async function getZohoOrganizationDetails(options?: {
  organizationId?: string | number;
  refreshToken?: string;
}): Promise<ZohoOrganizationDetails> {
  const path = options?.organizationId
    ? `/api/organization/${options.organizationId}`
    : "/api/organization";

  return zohoMailRequest<ZohoOrganizationDetails>(path, {
    refreshToken: options?.refreshToken,
  });
}

async function getZohoDomainDetails(params: {
  organizationId: string | number;
  domain: string;
  refreshToken?: string;
}): Promise<ZohoDomainDetails | null> {
  const domain = normalizeDomain(params.domain);

  try {
    return await zohoMailRequest<ZohoDomainDetails>(
      `/api/organization/${params.organizationId}/domains/${encodeURIComponent(domain)}`,
      {
        refreshToken:
          params.refreshToken ??
          process.env.ZOHO_REFRESH_TOKEN_DOMAINS ??
          process.env.ZOHO_REFRESH_TOKEN,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("INVALID_DOMAIN") || message.includes("not found")) {
      return null;
    }
    throw error;
  }
}

export async function checkZohoInboxExists({
  orgId,
  email,
}: {
  orgId: string;
  email: string;
}) {
  const token = await getZohoAccessToken();

  const res = await fetch(
    `${getRequiredEnv("ZOHO_MAIL_BASE_URL")}/api/organization/${orgId}/accounts`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    },
  );

  const data = (await res.json()) as
    | ZohoResponse<ZohoMailAccount[]>
    | ZohoArrayErrorResponse;

  if (!res.ok || isZohoArrayError(data)) {
    throw new Error(`Zoho accounts error: ${getZohoApiErrorMessage(data)}`);
  }

  const target = email.toLowerCase();
  const accounts = data.data ?? [];

  return accounts.some((account) => {
    const directEmails = [
      account.primaryEmailAddress,
      account.mailboxAddress,
    ].filter((value): value is string => typeof value === "string");

    const aliases = Array.isArray(account.emailAliases)
      ? account.emailAliases
      : [];

    const emailAddressEntries = Array.isArray(account.emailAddress)
      ? account.emailAddress
          .map((entry) => entry.mailId)
          .filter((value): value is string => typeof value === "string")
      : [];

    return [...directEmails, ...aliases, ...emailAddressEntries].some(
      (candidate) => candidate.toLowerCase() === target,
    );
  });
}

function isDomainVerified(domain: ZohoDomainDetails | null): boolean {
  if (!domain) return false;
  return Boolean(
    domain.verificationStatus ??
      domain.isVerified ??
      domain.isDomainVerified,
  );
}

export async function getZohoAccountAndDomainVerification(params: {
  domain: string;
  organizationId?: string | number;
}): Promise<ZohoVerificationStatus> {
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const organizationId = params.organizationId ?? process.env.ZOHO_ORG_ID;
  if (!organizationId) {
    throw new Error(
      "Zoho org ID nije podešen. Dodajte ZOHO_ORG_ID u env ili zohoOrgId na tenant.",
    );
  }

  const organization: ZohoOrganizationDetails = await getZohoOrganizationDetails({
        organizationId,
        refreshToken,
      }).catch(() => ({ zoid: organizationId }))

  const resolvedOrganizationId = organization.zoid;
  if (!resolvedOrganizationId) {
    throw new Error(
      "Zoho org ID nije pronađen. Dodajte ZOHO_ORG_ID u env ili zohoOrgId na tenant.",
    );
  }

  const requestedDomain = normalizeDomain(params.domain);
  const domain = await getZohoDomainDetails({
    organizationId: resolvedOrganizationId,
    domain: requestedDomain,
    refreshToken,
  });

  return {
    account: {
      verified: Boolean(organization.isEmailConfirmed),
      mailHostingEnabled: Boolean(organization.isMailHostingEnabled),
      organizationId: String(resolvedOrganizationId),
      organizationName: organization.orgName ?? null,
      primaryDomain: organization.primaryDomainName ?? null,
      superAdmin: organization.superAdmin ?? null,
    },
    domain: {
      requestedDomain,
      found: Boolean(domain),
      verified: isDomainVerified(domain),
      primary: Boolean(domain?.primary),
      mailHostingEnabled:
        domain?.mailHostingStatus ?? organization.isMailHostingEnabled ?? null,
      details: domain,
    },
  };
}
