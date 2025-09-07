export type AwsRegion = {
  code: string;
  name: string;
  partition: 'aws' | 'aws-cn' | 'aws-us-gov';
};

export const AWS_REGIONS: AwsRegion[] = [
  // United States
  { code: 'us-east-1', name: 'US East (N. Virginia)', partition: 'aws' },
  { code: 'us-east-2', name: 'US East (Ohio)', partition: 'aws' },
  { code: 'us-west-1', name: 'US West (N. California)', partition: 'aws' },
  { code: 'us-west-2', name: 'US West (Oregon)', partition: 'aws' },

  // Canada
  { code: 'ca-central-1', name: 'Canada (Central)', partition: 'aws' },
  { code: 'ca-west-1', name: 'Canada West (Calgary)', partition: 'aws' },

  // South America
  { code: 'sa-east-1', name: 'South America (São Paulo)', partition: 'aws' },

  // Europe
  { code: 'eu-west-1', name: 'Europe (Ireland)', partition: 'aws' },
  { code: 'eu-west-2', name: 'Europe (London)', partition: 'aws' },
  { code: 'eu-west-3', name: 'Europe (Paris)', partition: 'aws' },
  { code: 'eu-north-1', name: 'Europe (Stockholm)', partition: 'aws' },
  { code: 'eu-south-1', name: 'Europe (Milan)', partition: 'aws' },
  { code: 'eu-south-2', name: 'Europe (Spain)', partition: 'aws' },
  { code: 'eu-central-1', name: 'Europe (Frankfurt)', partition: 'aws' },
  { code: 'eu-central-2', name: 'Europe (Zurich)', partition: 'aws' },

  // Middle East
  { code: 'me-south-1', name: 'Middle East (Bahrain)', partition: 'aws' },
  { code: 'me-central-1', name: 'Middle East (UAE)', partition: 'aws' },

  // Africa
  { code: 'af-south-1', name: 'Africa (Cape Town)', partition: 'aws' },

  // Asia Pacific
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)', partition: 'aws' },
  { code: 'ap-south-2', name: 'Asia Pacific (Hyderabad)', partition: 'aws' },
  { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', partition: 'aws' },
  { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)', partition: 'aws' },
  { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)', partition: 'aws' },
  { code: 'ap-southeast-4', name: 'Asia Pacific (Melbourne)', partition: 'aws' },
  { code: 'ap-east-1', name: 'Asia Pacific (Hong Kong)', partition: 'aws' },
  { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', partition: 'aws' },
  { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)', partition: 'aws' },
  { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)', partition: 'aws' },

  // Israel
  { code: 'il-central-1', name: 'Israel (Tel Aviv)', partition: 'aws' },

  // China (AWS China)
  { code: 'cn-north-1', name: 'China (Beijing)', partition: 'aws-cn' },
  { code: 'cn-northwest-1', name: 'China (Ningxia)', partition: 'aws-cn' },

  // GovCloud (US)
  { code: 'us-gov-west-1', name: 'AWS GovCloud (US-West)', partition: 'aws-us-gov' },
  { code: 'us-gov-east-1', name: 'AWS GovCloud (US-East)', partition: 'aws-us-gov' },
];

export const AWS_REGION_NAME_BY_CODE = new Map(AWS_REGIONS.map(r => [r.code, r.name] as const));
