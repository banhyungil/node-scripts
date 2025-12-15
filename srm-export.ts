/** 
 * 젠킨스 정보 추출 스크립트 
 * */

import axios from "axios";
import ExcelJS from "exceljs";

// Jenkins API 응답 타입 정의
interface JenkinsBuild {
  number: number;
  result: string;
  duration: number;
  timestamp: number;
  changeSets?: JenkinsChangeSet[];
}

interface JenkinsChangeSet {
  items: JenkinsChangeItem[];
}

interface JenkinsChangeItem {
  msg: string;
  author: {
    fullName: string;
  };
  date: string;
}

interface JenkinsApiResponse {
  builds: JenkinsBuild[];
}

interface BuildData {
  number: number;
  result: string;
  durationSec: string;
  timestamp: string;
  changes: string;
}

// Jenkins 설정
const jenkinsServer = 'sakor042.cswind.com:21000'
const jobName = 'BATCH_PROD'
const JENKINS_URL = `http://${jenkinsServer}/job/${jobName}/api/json`;
const USERNAME = "admin"; // 필요 시
const PASSWORD = "AdminProd12*@!"; // 필요 시

async function exportBuildHistory(): Promise<void> {
  try {
    // API 요청
    const response = await axios.get<JenkinsApiResponse>(JENKINS_URL, {
      auth: {
        username: USERNAME,
        password: PASSWORD,
      },
      params: {
        tree: "builds[number,result,duration,timestamp,changeSets[items[msg,author[fullName],date]]]"
      }
    });
    } catch {
        
    }
}

