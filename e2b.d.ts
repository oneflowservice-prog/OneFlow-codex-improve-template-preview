declare module "e2b" {
  export class Sandbox {
    static create(options?: {
      apiKey?: string;
      timeout?: number;
      template?: string;
      metadata?: Record<string, string>;
      allowInternetAccess?: boolean;
      network?: {
        allowPublicTraffic?: boolean;
      };
    }): Promise<Sandbox>;

    readonly sandboxId: string;

    files: {
      write(
        files:
          | { path: string; data: string | ArrayBuffer }[]
          | string,
        data?: string | ArrayBuffer,
      ): Promise<unknown>;
    };

    commands: {
      run(
        command: string,
        options?: {
          cwd?: string;
          background?: boolean;
          timeoutMs?: number;
          requestTimeoutMs?: number;
        },
      ): Promise<{
        exitCode: number;
        stdout?: string;
        stderr?: string;
      }>;
    };

    getHost(port: number): string;
  }
}
