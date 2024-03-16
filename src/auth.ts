import { getLoginUrl, getSessionToken } from "./login.js"
import { input, redirectLinkParser } from "./util.js"
import type { Option } from "@sniptt/monads";
import { Some, None } from "@sniptt/monads";

export async function auth(): Promise<string> {
    try {
        const auth_params = getLoginUrl();

        console.log("Auth URL: " + "\u001b[32m" + auth_params.url + "\u001b[0m"); // green text

        const login_url = redirectLinkParser(await input("Please jump to the following URL, copy the URL starting with 'np5c38e31cd085304b://' and paste it into the standard input: "));

        const session_token_code: string = login_url.session_token_code;
        const code_verifier = auth_params.code_verifier;
        const session_token = (await getSessionToken(session_token_code, code_verifier)).unwrap();

        console.log("session_token: " + "\u001b[32m" + session_token + "\u001b[0m");

        return session_token;
    }
    catch (error) {
        console.error(error);
        return "";
    }
}
