import { getServiceToken } from "./login.js"
import { getGameList, parseGameList } from "./game.js"
import * as dotenv from "dotenv";

export async function exec(): Promise<{ title: string, icon: string, total_played_hours: number }[]> {
  dotenv.config();
  const session_token: string = process.env.SESSION_TOKEN!;

  const service_id_token = (await getServiceToken(session_token)).unwrap().id_token;

  return parseGameList((await getGameList(service_id_token)).unwrap());
}
