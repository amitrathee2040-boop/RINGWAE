declare module "photon-realtime" {
  const Photon: {
    LoadBalancingClient: new (protocol: number, appId: string, appVersion: string) => {
      isConnected(): boolean;
      connectToRegionMaster(region: string): void;
      createRoom(name: string, options?: {
        maxPlayers?: number;
        isVisible?: boolean;
        isOpen?: boolean;
      }): void;
      joinRoom(name: string): void;
      leaveRoom(): void;
      disconnect(): void;
      onConnected: () => void;
      onRoomCreated: () => void;
      onRoomJoined: () => void;
      onError: (code: number, msg: string) => void;
      sendEvent(code: number, data: unknown): void;
      onEvent: (code: number, content: unknown, actorNr: number) => void;
    };
    ConnectionProtocol: { Wss: number; Ws: number };
  };
  export default Photon;
}
