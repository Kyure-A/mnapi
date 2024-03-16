import qs from "qs";
import * as readline from "readline"

type RedirectLinkParams = {
  session_state: string,
  session_token_code: string,
  state: string
}

export function redirectLinkParser(url: string): RedirectLinkParams {
  const params = url.split('#')[1];
  const parsed_params = qs.parse(params);
  const result: RedirectLinkParams = {
    state: parsed_params.state as string,
    session_token_code: parsed_params.session_token_code as string,
    session_state: parsed_params.session_state as string,
  }

  return result;
}
