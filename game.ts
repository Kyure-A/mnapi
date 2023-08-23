import { getAccessToken } from "./auth.js"

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
