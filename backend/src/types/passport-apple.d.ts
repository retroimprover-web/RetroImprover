declare module 'passport-apple' {
  import passport from 'passport';
  
  export interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString: string;
    callbackURL: string;
  }
  
  export interface AppleProfile {
    id: string;
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  }
  
  export interface AppleIdToken {
    email?: string;
    sub: string;
  }
  
  export class Strategy extends passport.Strategy {
    constructor(
      options: AppleStrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        idToken: AppleIdToken | string,
        profile: AppleProfile | undefined,
        done: (error: any, user?: any) => void
      ) => void
    );
    authenticate(req: any, options?: any): void;
  }
}

