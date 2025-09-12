// Canonical AWS regions list (unified)
export type AwsRegion = {
  code: string;
  name: string;
  partition: 'aws' | 'aws-cn' | 'aws-us-gov';
  // Approximate number of Availability Zones. Subject to change by AWS.
  azCount?: number;
};

export const AWS_REGIONS: AwsRegion[] = [
  // United States
  { code: 'us-east-1', name: 'US East (N. Virginia)', partition: 'aws', azCount: 6 },
  { code: 'us-east-2', name: 'US East (Ohio)', partition: 'aws', azCount: 3 },
  { code: 'us-west-1', name: 'US West (N. California)', partition: 'aws', azCount: 3 },
  { code: 'us-west-2', name: 'US West (Oregon)', partition: 'aws', azCount: 4 },

  // Canada
  { code: 'ca-central-1', name: 'Canada (Central)', partition: 'aws', azCount: 3 },
  { code: 'ca-west-1', name: 'Canada West (Calgary)', partition: 'aws', azCount: 3 },

  // South America
  { code: 'sa-east-1', name: 'South America (São Paulo)', partition: 'aws', azCount: 3 },

  // Europe
  { code: 'eu-west-1', name: 'Europe (Ireland)', partition: 'aws', azCount: 3 },
  { code: 'eu-west-2', name: 'Europe (London)', partition: 'aws', azCount: 3 },
  { code: 'eu-west-3', name: 'Europe (Paris)', partition: 'aws', azCount: 3 },
  { code: 'eu-north-1', name: 'Europe (Stockholm)', partition: 'aws', azCount: 3 },
  { code: 'eu-south-1', name: 'Europe (Milan)', partition: 'aws', azCount: 3 },
  { code: 'eu-south-2', name: 'Europe (Spain)', partition: 'aws', azCount: 3 },
  { code: 'eu-central-1', name: 'Europe (Frankfurt)', partition: 'aws', azCount: 3 },
  { code: 'eu-central-2', name: 'Europe (Zurich)', partition: 'aws', azCount: 3 },

  // Middle East
  { code: 'me-south-1', name: 'Middle East (Bahrain)', partition: 'aws', azCount: 3 },
  { code: 'me-central-1', name: 'Middle East (UAE)', partition: 'aws', azCount: 3 },

  // Africa
  { code: 'af-south-1', name: 'Africa (Cape Town)', partition: 'aws', azCount: 3 },

  // Asia Pacific
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)', partition: 'aws', azCount: 3 },
  { code: 'ap-south-2', name: 'Asia Pacific (Hyderabad)', partition: 'aws', azCount: 3 },
  { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', partition: 'aws', azCount: 3 },
  { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)', partition: 'aws', azCount: 3 },
  { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)', partition: 'aws', azCount: 3 },
  { code: 'ap-southeast-4', name: 'Asia Pacific (Melbourne)', partition: 'aws', azCount: 3 },
  { code: 'ap-east-1', name: 'Asia Pacific (Hong Kong)', partition: 'aws', azCount: 3 },
  { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', partition: 'aws', azCount: 4 },
  { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)', partition: 'aws', azCount: 4 },
  { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)', partition: 'aws', azCount: 3 },

  // Israel
  { code: 'il-central-1', name: 'Israel (Tel Aviv)', partition: 'aws', azCount: 3 },

  // China (AWS China)
  { code: 'cn-north-1', name: 'China (Beijing)', partition: 'aws-cn', azCount: 3 },
  { code: 'cn-northwest-1', name: 'China (Ningxia)', partition: 'aws-cn', azCount: 3 },

  // GovCloud (US)
  { code: 'us-gov-west-1', name: 'AWS GovCloud (US-West)', partition: 'aws-us-gov', azCount: 3 },
  { code: 'us-gov-east-1', name: 'AWS GovCloud (US-East)', partition: 'aws-us-gov', azCount: 3 },
];

export const AWS_REGION_NAME_BY_CODE = new Map(AWS_REGIONS.map(r => [r.code, r.name] as const));
export const AWS_REGION_AZ_COUNT = new Map(AWS_REGIONS.filter(r => r.azCount != null).map(r => [r.code, r.azCount as number] as const));

export function searchAwsRegions(query: string): AwsRegion[] {
  const q = query.trim().toLowerCase();
  if (!q) return AWS_REGIONS;
  return AWS_REGIONS.filter(r => r.code.includes(q) || r.name.toLowerCase().includes(q));
}
