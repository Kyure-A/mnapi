import { auth } from "./auth.js"

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
        "X-ProductVersion": "1.0.4",
        "X-Platform": "iOS",
        "User-Agent": "com.nintendo.znca/1.0.4 (iOS/10.3.3)",
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
