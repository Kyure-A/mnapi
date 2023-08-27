import { Option, Some, None } from "@sniptt/monads";
import * as crypto from "crypto";
import * as dotenv from "dotenv"; dotenv.config();
import * as Selenium from "selenium-webdriver";

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

// https://dev.to/mathewthe2/intro-to-nintendo-switch-rest-api-2cm7

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
    // 最悪使わなくてもなんとかなるっぽい
    const url = getLoginUrl().url;
    const selenium = new Selenium.Builder();
    const browser = selenium.forBrowser("chrome").build();
    const window = browser.get(url);

    // 自動化が検知されて error を吐いてくるのでなんとかする
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
