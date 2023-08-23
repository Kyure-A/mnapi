import { Option, Some, None } from "@sniptt/monads";

type fResponse = {
    "request_id": string,
    "timestamp": number,
    "f": string
}

type AccessTokenResponse = {
    "result": {
        "user": {
            "imageUri": string, // url
            "supportId": string,
            "name": string,
            "id": string[]
        },
        "firebaseCredential": {
            "accessToken": string, // firebase token here
            "expiresIn": number // 3600
        },
        "webApiServerCredential": {
            "accessToken": string, // webapi token here
            "expiresIn": number //7200
        }
    },
    "status": number, // 0
    "correlationId": string // "61becf03-0ae45082"
}

async function getF(token: string): Promise<Option<fResponse>> {
    const param = {
        "User-Agent": "nx-embeds/1.0.0",
        "Content-Type": "application/json",
        "token": token,
        "hash_method": 1
    }

    await fetch("https://api.imink.app/f", {
        method: "POST",
        headers: {
            body: JSON.stringify(param)
        }
    }).then(response => {
        return response.json();
    }).then(data => {
        return Some(data);
    });

    return None;
}

export async function getAccessToken(request_id: string, timestamp: string, f: string): Promise<Option<string>> {
    const param = {
        "parameter": {
            "language": "en-US",
            "naBirthday": "yyyy-mm-dd",
            "naCountry": "US",
            "naIdToken": "[tokengoeshere]",
            "requestId": request_id,
            "timestamp": timestamp,
            "f": f
        }
    }

    await fetch("https://api-lp1.znc.srv.nintendo.net/v1/Account/Login", {
        method: "POST",
        headers: {
            body: JSON.stringify(param),
        }

    }).then(response => {
        return response.json();
    }).then(data => {
        const token: string = data["webApiServerCredential"]["accessToken"];
        return Some(token);
    });

    return None;
}
