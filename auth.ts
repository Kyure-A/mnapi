import * as crypto from "crypto";
import * as base64url from "base64-url";
import * as Selenium from "selenium-webdriver";
import * as Chromedriver from "chromedriver";

type URLparams = {
    state: string,
    redirect_uri: "npf71b963c1b7b6d119://auth&client_id=71b963c1b7b6d119",
    scope: "openid%20user%20user.birthday%20user.mii%20user.screenName",
    response_type: "session_token_code",
    session_token_code_challenge: string,
    session_token_code_challenge_method: "S256",
    theme: "login_form"
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

function loginToNSO(url: string): void {
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

        const sendLoginId = loginIdBox.sendKeys("aaa");

        return sendLoginId;
    }).then(() => {
        console.log("Username filled");

        const loginPassBox = browser.findElement(
            Selenium.By.id("login-form-password")
        );

        return loginPassBox;
    }).then((loginPassBox) => {

        const sendLoginPass = loginPassBox.sendKeys("aaa");
        return sendLoginPass;
    }).then(() => {
        console.log("Password filled");

        // get the continue button
        let loginButton = browser.findElement(
            Selenium.By.id("accounts-login-button")
        );
        return loginButton;
    }).then((loginButton) => {

        // click on the continue button
        loginButton.click();
        console.log("Completed");

    }).catch(function(error) {
        console.log("Error ", error);
    });
}


console.log(getLoginUrl());
loginToNSO(getLoginUrl());
