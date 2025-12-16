export type BookingFilter = {
  startDate: string;
  department: string;
  locationUuids: string;
};

export type BookingDto = BookingFilter & {
  startIndex: string;
  limit: string;
};

export type DailyBookingsResult = {
  ccc_number: string;
  ovcid_id: string;
  upi_number: string;
  program: string;
  rtc_date: string;
  med_pick_up_date: string;
  arv_first_regimen_start_date: string;
  hiv_disclosure_status: string;
  height: number;
  weight: number;
  stage: number;
  patient_categorization: string;
  service_delivery_model: string;
  dsd_model: string;
  cd4_date: string;
  cd4_results: number;
  patient_uuid: string;
  gender: string;
  birthdate: string;
  age: number;
  person_name: string;
  identifiers: string;
  phone_number: string;
  latest_rtc_date: string;
  latest_vl: number;
  vl_category: string;
  latest_vl_date: string;
  last_appointment: string;
  visit_type: string;
  cur_meds: string;
  previous_vl: number;
  previous_vl_date: string;
  nearest_center: string;
  covid_19_vaccination_status: string;
  sms_consent_provided: string;
  sms_receive_time: string;
  sms_delivery_status: string;
  tb_screening_date: string;
  patient_category: string;
  tb_screening_result: string;
  cervical_screening_date: string;
  cervical_screening_method: string;
  cervical_screening_result: string;
};

export type DailyBookingsReponse = {
  schemas: any;
  sqlQuery: string;
  result: DailyBookingsResult[];
};

export enum DailyBookingType {
  Appointments = 'daily-appointments',
  Visits = 'daily-visits',
  HasNotReturned = 'daily-has-not-returned',
}
