import { ClearlyDefinedNoticeResponse, type Format } from '../schema';

export class ClearlyDefinedClient {
  async fetchNoticeFile(
    coordinates: string[],
    format: Format
  ): Promise<ClearlyDefinedNoticeResponse> {
    const response = await fetch('https://api.clearlydefined.io/notices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates,
        renderer: format,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const noticeRes = await response.json();

    const res = await ClearlyDefinedNoticeResponse.safeParseAsync(noticeRes);
    if (!res.success) {
      console.log(
        `::error::Invalid response from ClearlyDefined: ${res.error}`
      );
      throw new Error();
    }

    return res.data;
  }
}
