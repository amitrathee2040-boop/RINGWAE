/**
 * Photon Realtime client for Ring War multiplayer rooms.
 * Uses Photon as an alternative/backup networking layer alongside Firebase.
 */
import Photon from "photon-realtime";
import { isOfflineModePreferred, logOnlineInit } from "../lib/offlineMode";

const { LoadBalancingClient, ConnectionProtocol } = Photon;

export type PhotonClient = InstanceType<typeof LoadBalancingClient>;

const APP_ID = import.meta.env.VITE_PHOTON_APP_ID ?? "";

let _client: PhotonClient | null = null;

export function getPhotonClient(): PhotonClient {
  if (isOfflineModePreferred()) {
    throw new Error("[OFFLINE MODE] Photon disabled — switch to Online Mode to use multiplayer");
  }
  if (!_client && APP_ID) {
    _client = new LoadBalancingClient(ConnectionProtocol.Wss, APP_ID, "1.0");
    logOnlineInit("Photon");
  }
  if (!_client) throw new Error("Photon APP_ID not configured (VITE_PHOTON_APP_ID)");
  return _client;
}

export interface PhotonRoomOptions {
  maxPlayers: number;
  isVisible?: boolean;
  isOpen?: boolean;
}

export async function createPhotonRoom(
  roomName: string,
  options: PhotonRoomOptions = { maxPlayers: 2 },
): Promise<void> {
  const client = getPhotonClient();
  return new Promise((resolve, reject) => {
    client.onRoomCreated = () => resolve();
    client.onError = (_code: number, msg: string) => reject(new Error(msg));
    if (!client.isConnected()) {
      client.onConnected = () => {
        client.createRoom(roomName, {
          maxPlayers: options.maxPlayers,
          isVisible: options.isVisible ?? true,
          isOpen: options.isOpen ?? true,
        });
      };
      client.connectToRegionMaster("us");
    } else {
      client.createRoom(roomName, {
        maxPlayers: options.maxPlayers,
        isVisible: options.isVisible ?? true,
        isOpen: options.isOpen ?? true,
      });
    }
  });
}

export async function joinPhotonRoom(roomName: string): Promise<void> {
  const client = getPhotonClient();
  return new Promise((resolve, reject) => {
    client.onRoomJoined = () => resolve();
    client.onError = (_code: number, msg: string) => reject(new Error(msg));
    if (!client.isConnected()) {
      client.onConnected = () => client.joinRoom(roomName);
      client.connectToRegionMaster("us");
    } else {
      client.joinRoom(roomName);
    }
  });
}

export function leavePhotonRoom(): void {
  _client?.leaveRoom();
}

export function disconnectPhoton(): void {
  _client?.disconnect();
  _client = null;
}
