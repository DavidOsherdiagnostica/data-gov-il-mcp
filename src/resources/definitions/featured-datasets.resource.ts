/**
 * Curated catalog of high-value, queryable datasets on data.gov.il.
 * Provides ready-to-use resource IDs and real field schemas so an LLM can
 * start calling search_records() immediately without a discovery round-trip.
 *
 * Schemas and record counts are verified against the live API (2026-06-17).
 * Update this file when datasets change significantly.
 */
import type {
  ResourceDefinition,
  ResourceContent,
  ResourceListItem,
} from "../resource.interface.js";

export interface FeaturedDatasetField {
  id: string;
  type: "text" | "numeric" | "int" | "date" | "bool";
  description?: string;
}

export interface FeaturedDatasetResource {
  id: string;
  name: string;
  format: string;
  total_records: number;
  fields: FeaturedDatasetField[];
}

export interface FeaturedDataset {
  name: string;
  title: string;
  title_en: string;
  description: string;
  organization: string;
  last_modified: string;
  tags: string[];
  resources: FeaturedDatasetResource[];
  use_cases: string[];
}

export interface FeaturedCatalog {
  note: string;
  catalog_updated: string;
  datasets: FeaturedDataset[];
}

export const FEATURED: FeaturedCatalog = {
  note: "Curated catalog of high-value datasets. Each resource.id can be used directly with search_records().",
  catalog_updated: "2026-06-17",
  datasets: [
    {
      name: "branches",
      title: "סניפי בנקים",
      title_en: "Bank Branches",
      description:
        "All active bank branches in Israel with addresses, phone numbers, and accessibility info. " +
        "Maintained by Bank of Israel. Updated daily.",
      organization: "bank_israel",
      last_modified: "2026-06-17",
      tags: ["אוצר וכלכלה"],
      resources: [
        {
          id: "2202bada-4baf-45f5-aa61-8c5bad9646d3",
          name: "סניפים - עברית",
          format: "CSV",
          total_records: 1394,
          fields: [
            { id: "Bank_Code", type: "numeric", description: "Bank numeric code" },
            { id: "Bank_Name", type: "text", description: "Bank name (Hebrew)" },
            { id: "Branch_Code", type: "numeric", description: "Branch numeric code" },
            { id: "Branch_Name", type: "text", description: "Branch name" },
            { id: "Branch_Address", type: "text", description: "Street address" },
            { id: "City", type: "text", description: "City name (Hebrew)" },
            { id: "Zip_Code", type: "numeric" },
            { id: "Telephone", type: "text" },
            {
              id: "Handicap_Access",
              type: "text",
              description: "Wheelchair accessibility: 'כן'/'לא'",
            },
            { id: "Branch_Type", type: "text", description: "Branch type classification" },
            { id: "X_Coordinate", type: "numeric", description: "Israel TM grid X" },
            { id: "Y_Coordinate", type: "numeric", description: "Israel TM grid Y" },
          ],
        },
        {
          id: "6f3bda2a-8cde-4b86-a1c8-2761862b1224",
          name: "סניפים - אנגלית",
          format: "CSV",
          total_records: 1394,
          fields: [
            { id: "Bank_Code", type: "numeric" },
            { id: "Bank_Name", type: "text", description: "Bank name (English)" },
            { id: "Branch_Code", type: "numeric" },
            { id: "Branch_Name", type: "text", description: "Branch name (English)" },
            { id: "Branch_Address", type: "text" },
            { id: "City", type: "text", description: "City name (English)" },
            { id: "Zip_Code", type: "numeric" },
            { id: "Telephone", type: "text" },
            { id: "Handicap_Access", type: "text" },
            { id: "Branch_Type", type: "text" },
            { id: "X_Coordinate", type: "numeric" },
            { id: "Y_Coordinate", type: "numeric" },
          ],
        },
      ],
      use_cases: [
        "Find all bank branches in a specific city: filters={City: 'תל אביב -יפו'}",
        "List all branches of a specific bank: filters={Bank_Name: 'בנק לאומי'}",
        "Find accessible branches: filters={Handicap_Access: 'כן'}",
        "Count branches per city: use distinct='City'",
      ],
    },
    {
      name: "bus_stops",
      title: "תחנות תחבורה ציבורית",
      title_en: "Public Transit Stops",
      description:
        "All public transit stops in Israel (bus, light rail, national rail). " +
        "Includes GPS coordinates, city, and metropolin. ~34K stops. Updated monthly.",
      organization: "ministry_of_transport",
      last_modified: "2026-06-01",
      tags: ["תחבורה", "משרד התחבורה"],
      resources: [
        {
          id: "e873e6a2-66c1-494f-a677-f5e77348edb0",
          name: "תחנות תחבורה ציבורית",
          format: "CSV",
          total_records: 33937,
          fields: [
            { id: "StationId", type: "numeric", description: "Unique station identifier" },
            { id: "CityCode", type: "numeric" },
            { id: "CityName", type: "text", description: "City name (Hebrew)" },
            {
              id: "MetropolinCode",
              type: "numeric",
              description: "Metropolin (metro area) code",
            },
            { id: "MetropolinName", type: "text", description: "Metropolin name (Hebrew)" },
            { id: "StationTypeCode", type: "numeric" },
            {
              id: "StationTypeName",
              type: "text",
              description: "Type: תחנה רגילה, רציף, etc.",
            },
            { id: "StationOperatorTypeCode", type: "numeric" },
            {
              id: "StationOperatorTypeName",
              type: "text",
              description: "Operator type: מפעילי אוטובוסים, רכבת ישראל, etc.",
            },
            { id: "Lat", type: "numeric", description: "Latitude (WGS84)" },
            { id: "Long", type: "numeric", description: "Longitude (WGS84)" },
          ],
        },
      ],
      use_cases: [
        "Find stops in a city: filters={CityName: 'חיפה'}",
        "Find stops by metropolin: filters={MetropolinName: 'תל אביב'}",
        "Find rail stations: filters={StationOperatorTypeName: 'רכבת ישראל'}",
        "List all cities with stops: distinct='CityName'",
      ],
    },
    {
      name: "mechir-lamishtaken",
      title: "נתונים תקופתיים - תכנית דירה בהנחה",
      title_en: "Affordable Housing Program (Mechir LaMishtaken)",
      description:
        "Statistical data on Israel's subsidized housing lottery program (מחיר למשתכן). " +
        "Tracks lottery events and available apartments. Updated weekly by Ministry of Housing.",
      organization: "ministry_of_housing",
      last_modified: "2026-06-17",
      tags: ["בינוי", "דיור", "מחיר למשתכן", "שיכון"],
      resources: [
        {
          id: "7c8255d0-49ef-49db-8904-4cf917586031",
          name: "מעקב אחר הגרלות דירה בהנחה",
          format: "CSV",
          total_records: 2352,
          fields: [
            { id: "LotteryId", type: "numeric", description: "Lottery identifier" },
            { id: "LotteryType", type: "text", description: "Lottery round/type" },
            { id: "LotteryStatusValue", type: "text", description: "Current lottery status" },
            { id: "LotteryExecutionDate", type: "text", description: "Lottery execution date" },
            { id: "LotteryEndSignupDate", type: "text", description: "Signup end date" },
            { id: "CentralizationType", type: "text", description: "Grouped lottery campaign" },
            {
              id: "MarketingMethodDesc",
              type: "text",
              description: "Marketing method description",
            },
            { id: "MarketingRep", type: "text", description: "Marketing representative" },
            { id: "LamasName", type: "text", description: "Municipality/locality name" },
            { id: "LamasCode", type: "numeric", description: "CBS locality code" },
            { id: "Neighborhood", type: "text", description: "Neighborhood name" },
            { id: "ProjectId", type: "numeric", description: "Project identifier" },
            { id: "ProjectName", type: "text", description: "Project name" },
            { id: "ProjectStatus", type: "text", description: "Project/construction status" },
            { id: "ProviderName", type: "text", description: "Developer/provider name" },
            { id: "PriceForMeter", type: "text", description: "Price per square meter" },
            {
              id: "LotteryHousingUnits",
              type: "numeric",
              description: "Housing units allocated to the lottery",
            },
            {
              id: "LotteryNativeHousingUnits",
              type: "numeric",
              description: "Housing units reserved for local residents",
            },
            { id: "Subscribers", type: "numeric", description: "Total registered applicants" },
            {
              id: "SubscribersBenyMakom",
              type: "numeric",
              description: "Local-resident applicants",
            },
            { id: "SubscribersDisabled", type: "numeric", description: "Disabled applicants" },
            { id: "Winners", type: "numeric", description: "Total winners" },
            { id: "WinnersHasryDiur", type: "numeric", description: "First-home winners" },
            { id: "WinnersMeshapryDiur", type: "numeric", description: "Housing improver winners" },
          ],
        },
        {
          id: "ea93b3c9-15e2-4b74-a632-097ee53737e4",
          name: "דירות למכירה ללא הגרלה",
          format: "CSV",
          total_records: 0,
          fields: [{ id: "_id", type: "int", description: "Datastore row identifier" }],
        },
      ],
      use_cases: [
        "Find lottery projects by city/locality: filters={LamasName: 'מגדל העמק'}",
        "Find lotteries by status: filters={LotteryStatusValue: 'פורסמו תוצאות'}",
        "Sort lotteries by demand: sort=['Subscribers desc']",
        "Analyze supply by locality using fields=['LamasName','LotteryHousingUnits','Subscribers','Winners']",
      ],
    },
    {
      name: "air-stations",
      title: "תחנות ניטור איכות אוויר",
      title_en: "Air Quality Monitoring Stations",
      description:
        "All air quality monitoring stations in Israel operated by the Ministry of Environmental Protection. " +
        "Includes location, monitored pollutants (SO2, NOx, O3, PM10, PM2.5), and meteorological sensors. " +
        "159 stations nationwide.",
      organization: "ministry_of_the_environment",
      last_modified: "2024-04-01",
      tags: ["סביבה", "מים"],
      resources: [
        {
          id: "782cfb94-ebbd-4f41-aba2-80c298457a58",
          name: "תחנות ניטור איכות אוויר",
          format: "CSV",
          total_records: 159,
          fields: [
            { id: "אזור", type: "text", description: "Region: צפון/מרכז/ירושלים/דרום/חיפה" },
            { id: "שם התחנה החדש", type: "text", description: "Current station name" },
            { id: "שם התחנה הישן", type: "text", description: "Former station name" },
            { id: "הגוף המנטר", type: "text", description: "Monitoring authority" },
            {
              id: "סוג התחנה",
              type: "text",
              description: "Station type: כללית, תעשייתית, תחבורתית",
            },
            {
              id: "סיווג אזור",
              type: "text",
              description: "Area classification: עירוני, כפרי, פרברי",
            },
            { id: "Station type", type: "text", description: "EN: Background/Industrial/Traffic" },
            { id: "Area type", type: "text", description: "EN: Urban/Rural/Suburban" },
            { id: "שנת הקמה", type: "text", description: "Year established" },
            { id: "ישוב", type: "text", description: "Settlement/city" },
            { id: "כתובת", type: "text", description: "Street address" },
            { id: "X", type: "text", description: "Israel TM grid X coordinate" },
            { id: "Y", type: "text", description: "Israel TM grid Y coordinate" },
            {
              id: "גובה מעל פני הים (מטר)",
              type: "text",
              description: "Elevation above sea level (meters)",
            },
            {
              id: "מזהמי אוויר",
              type: "text",
              description: "Space-separated pollutant codes: SO2 NOx NO NO2 O3 PM10 PM2.5",
            },
            {
              id: "פרמטרים מטאורולוגיים",
              type: "text",
              description: "Meteorological parameters: WS WD RH TEMP PREC",
            },
          ],
        },
      ],
      use_cases: [
        "Find stations in a region: filters={אזור: 'צפון הארץ'}",
        "Find stations measuring PM2.5",
        "Find industrial-area stations: filters={'סוג התחנה': 'תעשייתית'}",
        "List all cities with stations: distinct='ישוב'",
      ],
    },
  ],
};

export function featuredDatasetIds(): string[] {
  return FEATURED.datasets.map((dataset) => dataset.name);
}

export function featuredDatasetResources(): ResourceListItem[] {
  return FEATURED.datasets.map((dataset) => ({
    uri: `datagov://dataset/${dataset.name}`,
    name: dataset.name,
    title: dataset.title,
    description:
      `${dataset.title_en}. ${dataset.description} ` +
      `Organization: ${dataset.organization}. Tags: ${dataset.tags.join(", ")}.`,
    mimeType: "application/json",
  }));
}

export function createFeaturedDatasetsResource(): ResourceDefinition {
  return {
    uri: "datagov://featured",
    name: "Featured Datasets",
    description:
      "Curated catalog of high-value, queryable datasets on data.gov.il. " +
      "Each entry includes the ready-to-use resource_id for search_records(), " +
      "the verified field schema, record counts, and concrete example use-cases. " +
      "Read this resource to start working with data immediately without a discovery round-trip.",
    mimeType: "application/json",
    handler(): Promise<ResourceContent> {
      return Promise.resolve({
        uri: "datagov://featured",
        mimeType: "application/json",
        text: JSON.stringify(FEATURED, null, 2),
      });
    },
  };
}
