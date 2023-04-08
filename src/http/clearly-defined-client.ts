import { ClearlyDefinedNoticeResponse, Format } from '../schema.ts';
import got from 'got';
import core from '@actions/core';

export class ClearlyDefinedClient {
  async fetchNoticeFile(
    coordinates: string[],
    format: Format
  ): Promise<ClearlyDefinedNoticeResponse> {
    const noticeRes = await got
      .post('https://api.clearlydefined.io/notices', {
        json: {
          coordinates,
          renderer: format,
        },
      })
      .json();

    const res = await ClearlyDefinedNoticeResponse.safeParseAsync(noticeRes);
    if (!res.success) {
      core.error(`Invalid response from ClearlyDefined: ${res.error}`);
      throw new Error();
    }

    return res.data;
  }
}
