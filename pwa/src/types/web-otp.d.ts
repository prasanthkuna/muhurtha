interface OTPCredential extends Credential {
  code?: string;
}

interface OTPCredentialRequestOptions {
  otp: { transport: ("sms")[] };
  signal?: AbortSignal;
}

interface CredentialRequestOptions {
  otp?: { transport: ("sms")[] };
  signal?: AbortSignal;
}

interface Navigator {
  contacts?: {
    select: (
      properties: string[],
      options?: { multiple?: boolean },
    ) => Promise<{ tel?: string[]; name?: string[] }[]>;
  };
}
