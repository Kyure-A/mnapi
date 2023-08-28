import { getServiceToken } from "./login.js"
import { getGameList, parseGameList } from "./game.js"

export async function exec(): Promise<{ title: string, icon: string, total_played_hours: number }[]> {
  const session_token: string = process.env.session_token!;

  const service_id_token = (await getServiceToken(session_token)).unwrap().id_token;

  return parseGameList((await getGameList(service_id_token)).unwrap());
}
