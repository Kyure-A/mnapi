import type { Option } from "@sniptt/monads";
import { Some, None } from "@sniptt/monads";
import * as crypto from "crypto";
import * as dotenv from "dotenv"; dotenv.config();
import { NSOAppVersion } from "./constant.js"
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

type URLparams = {
    state: string,
    redirect_uri: string,
    client_id: string,
    scope: "openid%20user%20user.mii%20user.email%20user.links%5B%5D.id",
    response_type: "session_token_code",
    session_token_code_challenge: string,
    session_token_code_challenge_method: "S256",
};

type AuthParams = {
    state: string,
    code_verifier: string,
    code_challenge: string,
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
};

// --------------------------------------------------------------------------------------------------------- //

function generateAuthenticationParams(): AuthParams {
    const state = crypto.randomBytes(36).toString('base64url');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest().toString('base64url');
    return {
        state: state,
        code_verifier: code_verifier,
        code_challenge: code_challenge
    };
}

export function getLoginUrl() {
    const authParams: AuthParams = generateAuthenticationParams();

    const client_id = "5c38e31cd085304b";

    const params: URLparams = {
        state: authParams.state,
        redirect_uri: `npf${client_id}://auth`,
        client_id: client_id,
        scope: "openid%20user%20user.mii%20user.email%20user.links%5B%5D.id",
        response_type: "session_token_code",
        session_token_code_challenge: authParams.code_challenge,
        session_token_code_challenge_method: "S256",
    };

    const arrayParams = [];

    for (let key in params) {
        if (!params.hasOwnProperty(key)) continue;
        arrayParams.push(`${key}=${params[key as keyof typeof params]}`);
    }

    const stringParams = arrayParams.join('&');

    return {
        url: `https://accounts.nintendo.com/connect/1.0.0/authorize?${stringParams}`,
        code_verifier: authParams.code_verifier
    }
    // Nintendo の page に redirect されて、 authorize-switch-approval-link に session_token_code がふくまれる url がはいってる
}

export async function getSessionToken(session_token_code: string, code_verifier: string): Promise<Option<string>> {
    const params = {
        client_id: "5c38e31cd085304b",
        session_token_code: session_token_code,
        session_token_code_verifier: code_verifier
    };

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

export async function fAPI(service_id_token: string): Promise<Option<{ request_id: string, timestamp: number, f: string }>> {
    const params = {
        "token": service_id_token,
        "hash_method": 1
    };

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
        client_id: "5c38e31cd085304b",
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
        session_token: session_token,
    };

    try {
        const response = await Axios.post("https://accounts.nintendo.com/connect/1.0.0/api/token", params, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": `OnlineLounge/${NSOAppVersion} NASDKAPI Android`,
                "X-Platform": "Android",
                "X-ProductVersion": NSOAppVersion,
            },
        });

        return Some({ id_token: response.data.id_token, access_token: response.data.access_token });
    }
    catch (error) {
        console.error(error);

        return None;
    }
}

export async function getUserInfo(service_token: string): Promise<Option<{ language: string, birthday: string, country: string, }>> {
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
        const data: AccessTokenResponse = response.data;

        const token: string = data.result.webApiServerCredential.accessToken;

        return Some(token);
    }
    catch (error) {
        console.error(error);

        return None;
    }
}
