import { type DetectedIssueBundle } from "./types";

export const mockData: DetectedIssueBundle  = {
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 2,
  "entry": [
    {
      "resource": {
        "resourceType": "DetectedIssue",
        "id": "outbreak-cholera-2026-01-01-2026-11-19-1",
        "status": "preliminary",
        "code": {
          "coding": [
            {
              "system": "https://fhir.dha.go.ke/terminology/CodeSystem/detectedissue-cs",
              "code": "public-health-event-cluster",
              "display": "Public health event cluster"
            }
          ],
          "text": "public-health-event-cluster"
        },
        "severity": "high",
        "identifiedPeriod": {
          "start": "2026-01-01",
          "end": "2026-11-19"
        },
        "detail": "3 case(s) of cholera recorded between 2026-01-01 and 2026-11-19 — exceeds single-case expectation for an immediately-notifiable disease; public-health alert workflow applies.",
        "evidence": [
          {
            "detail": [
              {
                "display": "MOH 705A aggregate (cholera = 3)"
              }
            ]
          }
        ],
        "meta": {
          "profile": [
            "https://fhir.dha.go.ke/core/StructureDefinition/kenya-core-detectedissue"
          ]
        }
      }
    },
    {
      "resource": {
        "resourceType": "DetectedIssue",
        "id": "outbreak-measles-2026-01-01-2026-11-19-2",
        "status": "preliminary",
        "code": {
          "coding": [
            {
              "system": "https://fhir.dha.go.ke/terminology/CodeSystem/detectedissue-cs",
              "code": "public-health-event-cluster",
              "display": "Public health event cluster"
            }
          ],
          "text": "public-health-event-cluster"
        },
        "severity": "high",
        "identifiedPeriod": {
          "start": "2026-01-01",
          "end": "2026-11-19"
        },
        "detail": "2 case(s) of measles recorded between 2026-01-01 and 2026-11-19 — exceeds single-case expectation for an immediately-notifiable disease; public-health alert workflow applies.",
        "evidence": [
          {
            "detail": [
              {
                "display": "MOH 705A aggregate (measles = 2)"
              }
            ]
          }
        ],
        "meta": {
          "profile": [
            "https://fhir.dha.go.ke/core/StructureDefinition/kenya-core-detectedissue"
          ]
        }
      }
    }
  ]
};