import { NSOAppVersion } from "./constant.js"
import { getLoginUrl } from "./login.js"
import { input, redirectLinkParser } from "./util.js"
import { Option, Some, None } from "@sniptt/monads";
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

export async function getSessionToken(session_token_code: string, code_verifier: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        session_token_code: session_token_code,
        session_token_code_verifier: code_verifier
    }

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/session_token", params, {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "Accept-Language": "en-US",
                "Connection": "Keep-Alive",
                "Content-Type": "application/x-www-form-urlencoded",
                "Host": "accounts.nintendo.com",
                "User-Agent": `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
                "X-Platform": "Android",
                "X-ProductVersion": NSOAppVersion,
            },
        });

        return Some(response.data.session_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function fAPI(service_id_token: string): Promise<Option<fResponse>> {
    const params = {
        "token": service_id_token,
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
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
                "X-Platform": "Android",
                "X-ProductVersion": NSOAppVersion,
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
        "Authorization": `Bearer ${service_token}`,
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "OnlineLounge/2.7.0 NASDKAPI Android",
        "X-Platform": "Android",
        "X-ProductVersion": "2.7.0",
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

export async function getAccessToken(language: string, birthday: string, country: string, service_token: string, request_id: string, timestamp: number, f: string): Promise<Option<string>> {
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
        const response = await Axios.post("https://api-lp1.znc.srv.nintendo.net/v1/Account/Login", params, {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "Accept-Language": language,
                "Authorization": "Bearer",
                "Connection": "Keep-Alive",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": `com.nintendo.znca/${NSOAppVersion} (Android/7.1.2)`,
                "X-Platform": "Android",
                "X-ProductVersion": NSOAppVersion,
            },
        });
        const token: string = response.data.result.webApiServerCredential.accessToken;
        return Some(token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

export async function auth(objective: string = "access_token"): Promise<Option<string>> {
    try {
        const auth_params = getLoginUrl();

        console.log("Auth URL: " + "\u001b[32m" + auth_params.url + "\u001b[0m"); // green text

        const login_url = redirectLinkParser(await input("Please jump to the following URL, copy the URL starting with 'npf71b963c1b7b6d119://' and paste it into the standard input: "));

        const session_token_code: string = login_url.session_token_code;
        const code_verifier = auth_params.code_verifier;
        const session_token = (await getSessionToken(session_token_code, code_verifier)).unwrap();

        const service_token = (await getServiceToken(session_token)).unwrap();
        const service_id_token = service_token.id_token;
        const service_access_token = service_token.access_token;

        // べつに正しい値でなくても通るからいらんらしい
        const user_info = (await getUserInfo(service_access_token)).unwrap();
        const language = user_info.language;
        const birthday = user_info.birthday;
        const country = user_info.country;

        const f_response = (await fAPI(service_id_token)).unwrap();
        const request_id = f_response.request_id;
        const timestamp = f_response.timestamp;
        const f = f_response.f;

        // service_token までの生成がうまく行っているかの確認
        console.log(birthday);

        const access_token: string = (await getAccessToken(language, birthday, country, service_id_token, request_id, timestamp, f)).unwrap();

        if (objective == "service_id_token") return Some(service_id_token);
        else if (objective == "service_access_token") return Some(service_access_token);
        else if (objective == "session_token") return Some(session_token);
        else return Some(access_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}
