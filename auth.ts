import { Option, Some, None } from "@sniptt/monads";
import axios from "axios";
import * as base64url from "base64-url";
import * as crypto from "crypto";
import { wrapper } from "axios-cookiejar-support";
import { pipe } from "fp-ts/function";
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

type fResponse = {
    "request_id": string,
    "timestamp": number,
    "f": string
};

type UserInfo = {
    language: string,
    birthday: string,
    country: string,
};

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
};

// --------------------------------------------------------------------------------------------------------- //

const NSOAppVersion = "2.5.1";

const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Platform': 'Android',
    'X-ProductVersion': NSOAppVersion,
    'User-Agent': `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
}

export async function getSessionToken(session_token_code: string, code_verifier: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        session_token_code: session_token_code,
        session_token_code_verifier: code_verifier
    }

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/session_token", params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Platform': 'Android',
                'X-ProductVersion': NSOAppVersion,
                'User-Agent': `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
            },
        });

        return Some(response.data.session_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function fAPI(session_token: string): Promise<Option<fResponse>> {
    const params = {
        "token": session_token,
        "hash_method": 1
    }

    try {
        const response = await Axios.post("https://api.imink.app/f", params, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "nx-embeds/1.0.0",
            },
        });
        return Some({
            request_id: response.data.request_id,
            timestamp: response.data.timestamp,
            f: response.data.f
        });
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function getServiceToken(session_token: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
        session_token: session_token,
    }

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/token", {
            headers: headers,
            data: params,
        })
        return Some(response.data.id_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

async function getUserInfo(service_token: string): Promise<Option<UserInfo>> {
    const params = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Platform': 'Android',
        'X-ProductVersion': "2.7.0",
        'User-Agent': "OnlineLounge/2.7.0 NASDKAPI Android",
        Authorization: `Bearer ${service_token}`
    }

    try {
        const response = await Axios.get("https://api.accounts.nintendo.com/2.0.0/users/me", {
            headers: params,
        });
        return Some({
            language: response.data.language,
            birthday: response.data.birthday,
            country: response.data.country
        });
    }
    catch (error) {
        console.log(error);
        return None;
    }
}

async function getAccessToken(language: string, birthday: string, country: string, service_token: string, request_id: string, timestamp: number, f: string): Promise<Option<string>> {
    const params = {
        "parameter": {
            "language": language,
            "naBirthday": birthday,
            "naCountry": country,
            "naIdToken": service_token,
            "requestId": request_id,
            "timestamp": timestamp,
            "f": f
        }
    }

    try {
        const response = await Axios.post("https://api-lp1.znc.srv.nintendo.net/v1/Account/Login", {
            headers: headers,
            body: params
        });
        const token: string = response.data.webApiServerCredential.accessToken;
        return Some(token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function auth(session_token_code: string): Promise<Option<string>> {
    try {
        const code_verifier = base64url.encode(crypto.randomBytes(32).toString());
        const session_token = (await getSessionToken(session_token_code, code_verifier)).unwrap();
        const service_token = (await getServiceToken(session_token)).unwrap();
        const user_info = (await getUserInfo(service_token)).unwrap();
        const f_response = (await fAPI(session_token)).unwrap();
        const language = user_info.language;
        const birthday = user_info.birthday;
        const country = user_info.country;
        const request_id = f_response.request_id;
        const timestamp = f_response.timestamp;
        const f = f_response.f;

        const access_token = (await getAccessToken(language, birthday, country, service_token, request_id, timestamp, f)).unwrap();

        return Some(access_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}
