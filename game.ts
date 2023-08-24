import { auth } from "./auth.js"

const NSOAppVersion = "2.5.1";

type Game = {
    "whiteList": string[],
    "id": number,
    "uri": string,
    "name": string,
    "imageUri": string
}

type GameList = {
    "status": number,
    "correlationId": string,
    "result": Game[]
}

function getGameList(access_token: string) {
    const params = {
        "Content-Type": "application/json; charset=utf-8",
        "X-ProductVersion": NSOAppVersion,
        "X-Platform": "Android",
        "User-Agent": "com.nintendo.znca/${NSOAppVersion} (Android/7.1.2)",
        "Authorization": `Bearer: ${access_token}`
    };

    fetch("https://api-lp1.znc.srv.nintendo.net/v1/Game/ListWebServices", {
        method: "POST",
        headers: {
            body: JSON.stringify(params),
        }
    });
}

function parseGameList(game_list: GameList) {
    let result = [];

    for (let i = 0; i < game_list.result.length; i++) {
        const game_info = {
            name: game_list.result[i].name,
            icon: game_list.result[i].imageUri,
            url: game_list.result[i].uri
        }
        result.push(game_info);
    }

    return result;
}
