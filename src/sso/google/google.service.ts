import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';
import axios, { AxiosResponse } from 'axios';

interface GoogleUserInfo {
  email: string;
  given_name: string;
  family_name: string;
  picture: string;
}

@Injectable()
export class GoogleService {
  async googleCallback(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }> {
    try {
      const { data }: AxiosResponse<GoogleUserInfo> = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return {
        email: data.email,
        firstName: data.given_name,
        lastName: data.family_name,
        picture: data.picture,
      };
    } catch {
      throw new HttpException(
        ERRORS.GOOGLE_FETCH_FAILED,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
