import { Injectable, BadRequestException } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';

@Injectable()
export class FacebookProvider {
  handleAndValidateUserData(profile: any): {
    id: string;
    email: string;
    name: string;
  } {
    if (
      !profile ||
      !profile.id ||
      !profile.emails ||
      !profile.emails.length ||
      !profile.name
    ) {
      throw new BadRequestException(ERRORS.INVALID_FACEBOOK_PROFILE);
    }

    const userData = {
      id: profile.id,
      email: profile.emails[0].value,
      name: `${profile.name.givenName} ${profile.name.familyName}`,
    };

    return userData;
  }
}
