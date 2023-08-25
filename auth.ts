import { getLoginUrl, redirectLinkParser } from "./loginUrl.js"
import { Option, Some, None } from "@sniptt/monads";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import * as readline from "readline"
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

export async function getSessionToken(session_token_code: string, code_verifier: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        session_token_code: session_token_code,
        session_token_code_verifier: code_verifier
    }

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/session_token", params, {
            headers: {
                'User-Agent': `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
                'Accept-Language': 'en-US',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': 'accounts.nintendo.com',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip',
                'X-Platform': 'Android',
                'X-ProductVersion': NSOAppVersion,
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

export async function getServiceToken(session_token: string): Promise<Option<{ id_token: string, access_token: string }>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
        session_token: session_token,
    }

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/token", params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Platform': 'Android',
                'X-ProductVersion': NSOAppVersion,
                'User-Agent': `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
            },
        })
        return Some({ id_token: response.data.id_token, access_token: response.data.access_token });
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function getUserInfo(service_token: string): Promise<Option<UserInfo>> {
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

export async function getAccessToken(language: string, birthday: string, country: string, service_token: string, request_id: string, timestamp: number, f: string): Promise<Option<any>> {
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
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
                'X-ProductVersion': NSOAppVersion,
                'User-Agent': `com.nintendo.znca/${NSOAppVersion} (Android/7.1.2)`,
                Authorization: 'Bearer'
            },
            body: params
        });
        // const token: string = response.data.webApiServerCredential.accessToken;
        return Some(response.data);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

async function input(prompt: string): Promise<string> {
    process.stdin.setEncoding('utf-8');
    return new Promise((resolve) => {
        readline.createInterface({
            input: process.stdin,
            output: process.stdout
        }).question(prompt, (result) => {
            resolve(result);
        });
    });
}

export async function auth(): Promise<Option<string>> {
    try {
        const auth_params = getLoginUrl();

        console.log(auth_params.url);

        const login_url = redirectLinkParser(await input("Please jump to the following URL, copy the URL starting with 'npf71b963c1b7b6d119://' and paste it into the standard input: "));

        const session_token_code: string = login_url.session_token_code;
        const code_verifier = auth_params.code_verifier;
        const session_token = (await getSessionToken(session_token_code, code_verifier)).unwrap();

        const service_token = (await getServiceToken(session_token)).unwrap();
        const service_id_token = service_token.id_token;
        const service_access_token = service_token.access_token;

        const user_info = (await getUserInfo(service_access_token)).unwrap();
        const language = user_info.language;
        const birthday = user_info.birthday;
        const country = user_info.country;

        const f_response = (await fAPI(session_token)).unwrap();
        const request_id = f_response.request_id;
        const timestamp = f_response.timestamp;
        const f = f_response.f;

        // service_token までの生成がうまく行っているかの確認
        console.log(birthday);

        const access_token = (await getAccessToken(language, birthday, country, service_id_token, request_id, timestamp, f)).unwrap();

        return Some(access_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}
