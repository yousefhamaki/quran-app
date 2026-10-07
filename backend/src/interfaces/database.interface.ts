export interface IDatabaseDriver {
  connect(uri: string): Promise<unknown>;
  disconnect(): Promise<void>;
}
