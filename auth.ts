import { Option, Some, None } from "@sniptt/monads";
import axios from "axios";
import * as base64url from "base64-url";
import * as crypto from "crypto";
import * as dotenv from "dotenv"; dotenv.config();
import { pipe } from "fp-ts/function";
import * as Selenium from "selenium-webdriver";

type URLparams = {
    state: string,
    redirect_uri: "npf71b963c1b7b6d119://auth&client_id=71b963c1b7b6d119",
    scope: "openid%20user%20user.birthday%20user.mii%20user.screenName",
    response_type: "session_token_code",
    session_token_code_challenge: string,
    session_token_code_challenge_method: "S256",
    theme: "login_form"
};

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

// https://dev.to/mathewthe2/intro-to-nintendo-switch-rest-api-2cm7

function calculateChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(codeVerifier);
    const codeChallenge: string = base64url.encode(hash.digest().toString());
    return codeChallenge;
}

function generateAuthenticationParams(): { state: string, codeVerifier: string, codeChallenge: string } {
    const state = base64url.encode(crypto.randomBytes(36).toString())
    const codeVerifier = base64url.encode(crypto.randomBytes(32).toString());
    const codeChallenge = calculateChallenge(codeVerifier);
    return {
        state,
        codeVerifier,
        codeChallenge
    };
}

function getLoginUrl(): string {
    const authParams = generateAuthenticationParams();

    const params: URLparams = {
        state: authParams.state,
        redirect_uri: "npf71b963c1b7b6d119://auth&client_id=71b963c1b7b6d119",
        scope: "openid%20user%20user.birthday%20user.mii%20user.screenName",
        response_type: "session_token_code",
        session_token_code_challenge: authParams.codeChallenge,
        session_token_code_challenge_method: "S256",
        theme: "login_form"
    };

    const arrayParams = [];

    for (let key in params) {
        if (!params.hasOwnProperty(key)) continue;
        arrayParams.push(`${key}=${params[key as keyof typeof params]}`);
    }

    const stringParams = arrayParams.join('&');
    return `https://accounts.nintendo.com/connect/1.0.0/authorize?${stringParams}`;
    // Nintendo の page に redirect されて、 authorize-switch-approval-link に session_token_code がふくまれる url がはいってる
}

// Selenium でうまいことやっていきたい

function NSOId(): Option<string> {
    const result: string | undefined = process.env.NSOid;

    if (typeof result == "string") return Some(result);
    else return None;
}

function NSOPass(): Option<string> {
    const result: string | undefined = process.env.NSOpassword;

    if (typeof result == "string") return Some(result);
    else return None;
}

export function getSessionTokenCode(): Option<string> {
    const url = getLoginUrl();
    const selenium = new Selenium.Builder();
    const browser = selenium.forBrowser("chrome").build();
    const window = browser.get(url);

    window.then(function() {
        const timeOut = browser.manage().setTimeouts({
            implicit: 5000,
        });

        return timeOut;

    }).then(() => {

        const loginIdBox = browser.findElement(
            Selenium.By.id("login-form-id")
        );

        return loginIdBox;

    }).then((loginIdBox) => {

        const sendLoginId = loginIdBox.sendKeys(NSOId().unwrap());

        return sendLoginId;

    }).then(() => {

        console.log("Username filled");

        const loginPassBox = browser.findElement(
            Selenium.By.id("login-form-password")
        );
        return loginPassBox;

    }).then((loginPassBox) => {

        const sendLoginPass = loginPassBox.sendKeys(NSOPass().unwrap());
        return sendLoginPass;
    }).then(() => {
        console.log("Password filled");

        const loginButton = browser.findElement(
            Selenium.By.id("accounts-login-button")
        );
        return loginButton;

    }).then((loginButton) => {

        loginButton.click();
        console.log("Login Completed");

    }).then(() => {

        const redirectLinkElem = browser.findElement(
            Selenium.By.id("authorize-switch-approval-link")
        );

        return redirectLinkElem;

    }).then((redirectLinkElem) => {

        const redirectLink = redirectLinkElem.getAttribute("href");

        return redirectLink;

    }).then((redirectLink) => {

        const parser = new URL(redirectLink);

        if (parser.searchParams.has("session_token_code")) {
            const result = parser.searchParams.get("session_token_code");
            return Some(result);
        }
        else return None;

    }).catch((error) => {
        console.log("Error ", error);
    });

    return None;
}

async function fAPI(token: string): Promise<Option<fResponse>> {
    const param = {
        "token": token,
        "hash_method": 1
    }

    try {
        const response = await axios.post("https://api.imink.app/f", {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "nx-embeds/1.0.0",
            },
            body: JSON.stringify(param)
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

async function getSessionToken(session_token_code: string, codeVerifier: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        session_token_code: session_token_code,
        session_token_code_verifier: codeVerifier
    }

    try {
        const response = await axios.post("https://accounts.nintendo.com/connect/1.0.0/api/session_token", {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Platform': 'Android',
                'X-ProductVersion': "1.9.0",
                'User-Agent': `OnlineLounge/1.9.0 NASDKAPI Android`,
            },
            body: JSON.stringify(params),
        });

        return Some(response.data.session_token);
    }
    catch (error) {
        console.error(error);
        return None;
    }
}

// 自動化が検知されて error を吐いてくるのでなんとかする

async function getServiceToken(session_token: string): Promise<Option<string>> {
    const params = {
        client_id: "71b963c1b7b6d119",
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
        session_token: session_token,
    }

    try {
        const response = await axios.post("https://accounts.nintendo.com/connect/1.0.0/api/token", {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Platform': 'Android',
                'X-ProductVersion': "1.9.0",
                'User-Agent': `OnlineLounge/1.9.0 NASDKAPI Android`,
            },
            body: JSON.stringify(params),
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
        'X-ProductVersion': "1.9.0",
        'User-Agent': "OnlineLounge/1.9.0 NASDKAPI Android",
        Authorization: `Bearer ${service_token}`
    }

    try {
        const response = await axios.get("https://api.accounts.nintendo.com/2.0.0/users/me", {
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
        const response = await axios.post("https://api-lp1.znc.srv.nintendo.net/v1/Account/Login", {
            headers: {
                body: JSON.stringify(params),
            }
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
        const codeVerifier = base64url.encode(crypto.randomBytes(32).toString());
        const session_token = (await getSessionToken(session_token_code, codeVerifier)).unwrap();
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
