import { MyNintendoAppVersion } from "./constant.js"
import type { Option } from "@sniptt/monads";
import { Some, None } from "@sniptt/monads";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

declare module 'axios' {
    interface AxiosRequestConfig {
        jar?: CookieJar;
    }
}

const jar = new CookieJar();
const Axios = wrapper(axios.create({ jar }));
Axios.defaults.withCredentials = true;
Axios.defaults.jar = jar;

type PlayHistory = {
    "deviceType": string,  // "HAC"
    "firstPlayedAt": string, // "2023-01-12T04:48:12+09:00"
    "imageUrl": string, // "https://atum-img-lp1.cdn.nintendo.net/i/c/1427016279c04de0b080b8dd26e209e0_256",
    "lastPlayedAt": string, // "2023-08-09T16:11:06+09:00",
    "lastUpdatedAt": string, // "2023-08-27T21:28:38+09:00",
    "titleId": string, // "01008F6008C5E000",
    "titleName": string, // "ポケットモンスター バイオレット",
    "totalPlayedDays": number, // 47,
    "totalPlayedMinutes": number, // 23827
}

type RecentPlayHistory = {
    "dailyPlayHistories": [
        {
            "imageUrl": string, // "https://atum-img-lp1.cdn.nintendo.net/i/c/1427016279c04de0b080b8dd26e209e0_256",
            "titleId": string, // "01008F6008C5E000",
            "titleName": string, // "ポケットモンスター バイオレット",
            "totalPlayedMinutes": number, // 9
        }
    ],
    "playedDate": string // "2023-08-09T00:00:00+09:00"
}

type GameHistories = {
    "hiddenTitleList": any,
    "lastUpdatedAt": string,
    "playHistories": PlayHistory[],
    "recentPlayHistories": RecentPlayHistory[]
}

type GameList = {
    title: string,
    icon: string,
    total_played_hours: number
}

export async function getGameList(service_id_token: string): Promise<Option<GameHistories>> {
    try {
        const response = await Axios.get("https://news-api.entry.nintendo.co.jp/api/v1.1/users/me/play_histories", {
            headers: {
                "Accept": "application/json",
                "Accept-Language": "en-US",
                "Accept-Encoding": "gzip",
                "Authorization": `Bearer ${service_id_token}`,
                "Content-Type": "application/json",
                "User-Agent": `com.nintendo.znej/${MyNintendoAppVersion} (iOS/16.6)`,
            },
        });

        return Some(response.data);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

/* option = 0: 3DS (CTR) と Switch (HAC) の list が返る
   option = 1: Switch (HAC) の list が返る
   option = 2: 3DS (CTR) の list が返る */

function _parseGameList(option: 0 | 1 | 2) {
    return (game_list: GameHistories): GameList[] => {
        // 即時実行関数式
        let ignore_device_type: string | undefined = (() => {
            if (option == 1) return "CTR";
            else if (option == 2) return "HAC";
            else return undefined;
        })();

        const result = game_list.playHistories
            .filter(game => game.deviceType != ignore_device_type)
            .map(game => {
                return {
                    title: game.titleName,
                    icon: game.imageUrl,
                    total_played_hours: parseFloat((game.totalPlayedMinutes / 60).toFixed(1))
                }
            });

        return result;
    }
}

// curried function を使ってみたかっただけ
export const parseGameList = _parseGameList(0);
export const parseSwitchGameList = _parseGameList(1);
export const parse3DSGameList = _parseGameList(2);

export function sortGameList(game_list: GameList[], quantity: number = game_list.length) {
    const compare = (x: GameList, y: GameList): number => {
        if (x.total_played_hours >= y.total_played_hours) return -1;
        else return 1;
    }

    const sorted: GameList[] = Array.from(game_list).sort(compare);

    return sorted.slice(0, Math.min(quantity, game_list.length));
}
