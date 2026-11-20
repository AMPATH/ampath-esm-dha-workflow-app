import { openmrsFetch } from "@openmrs/esm-framework";
import { getHieBaseUrl } from "../shared/utils/get-base-url";
import { type DetectedIssueBundleEntry, type DetectedIssueBundle, type DetetectedIssesDto } from "./types";
import { mockData } from "./mock-data";

export async function fetchDetectedIssues(detetectedIssesDto: DetetectedIssesDto): Promise<DetectedIssueBundleEntry[]>{
  const hieBaseUrl  = await getHieBaseUrl();
  const url = `${hieBaseUrl}/dha-fhir/DetectedIssue?category=public-health-event&startDate=${detetectedIssesDto.startDate}&endDate=${detetectedIssesDto.endDate}`;
  const response = await openmrsFetch(url);
  const data = await response.json() as DetectedIssueBundle;
  return data.entry ?? [];
}