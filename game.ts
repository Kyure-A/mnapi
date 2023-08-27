import { Option, Some, None } from "@sniptt/monads";
import { auth } from "./auth.js"
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const NSOAppVersion = "2.1.0";

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
    "deviceType": string,  //"HAC"
    "firstPlayedAt": string, //"2023-01-12T04:48:12+09:00"
    "imageUrl": string, //"https://atum-img-lp1.cdn.nintendo.net/i/c/1427016279c04de0b080b8dd26e209e0_256",
    "lastPlayedAt": string, //"2023-08-09T16:11:06+09:00",
    "lastUpdatedAt": string, // "2023-08-27T21:28:38+09:00",
    "titleId": string, //"01008F6008C5E000",
    "titleName": string, //"ポケットモンスター バイオレット",
    "totalPlayedDays": number, //47,
    "totalPlayedMinutes": number, //23827
}

type RecentPlayHistory = {
    "dailyPlayHistories": [
        {
            "imageUrl": string, //"https://atum-img-lp1.cdn.nintendo.net/i/c/1427016279c04de0b080b8dd26e209e0_256",
            "titleId": string, //"01008F6008C5E000",
            "titleName": string, //"ポケットモンスター バイオレット",
            "totalPlayedMinutes": number, //9
        }
    ],
    "playedDate": string //"2023-08-09T00:00:00+09:00"
}

type GameList = {
    "hiddenTitleList": any,
    "lastUpdatedAt": string,
    "playHistories": Game[],
    "recentPlayHistories": RecentPlayHistory[]
}

export async function getGameList(access_token: string) {
    const headers = {
        "Accept": "application/json",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip",
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Connection": "Keep-Alive",
        "User-Agent": "com.nintendo.znej/${NSOAppVersion} (iOS/16.6)",
        "X-ProductVersion": NSOAppVersion,
        "X-Platform": "Android",
    }

    try {
        const response = await Axios.get("https://news-api.entry.nintendo.co.jp/api/v1.1/users/me/play_histories", {
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

    for (let game of game_list.playHistories) {
        const game_title: string = game.titleName;
        const game_url: string = game.imageUrl;
        const total_played_hours: number = game.totalPlayedMinutes / 60;
        result.push({
            game_title,
            game_url,
            total_played_hours
        })
    }

    return result;
}
