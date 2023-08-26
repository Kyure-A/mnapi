import { Option, Some, None } from "@sniptt/monads";
import { auth } from "./auth.js"
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const NSOAppVersion = "2.7.0";

declare module 'axios' {
    interface AxiosRequestConfig {
        jar?: CookieJar;
    }
}

const jar = new CookieJar();
const Axios = wrapper(axios.create({ jar }));
Axios.defaults.withCredentials = true;
Axios.defaults.jar = jar;

type Game = {
    "whiteList": string[],
    "id": number,
    "uri": string,
    "name": string,
    "imageUri": string,
    "hogehoge": string,
}

type GameList = {
    "status": number,
    "correlationId": string,
    "result": Game[]
}

export async function getGameList(access_token: string) {
    const headers = {
        "Accept": "application/json",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip",
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Connection": "Keep-Alive",
        "User-Agent": "com.nintendo.znca/${NSOAppVersion} (Android/7.1.2)",
        "X-ProductVersion": NSOAppVersion,
        "X-Platform": "Android",
    }

    try {
        const response = await Axios.post("https://api-lp1.znc.srv.nintendo.net/v1/Game/ListWebServices", {
            headers: headers,
        });

        return Some(response.data);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

function parseGameList(game_list: GameList) {
    let result = [];

    for (let i = 0; i < game_list.result.length; i++) {
        const game_info = {
            name: game_list.result[i].name,
            icon: game_list.result[i].imageUri,
            url: game_list.result[i].uri,
            playtime: game_list.result[i].hogehoge
        }
        result.push(game_info);
    }

    return result;
}
