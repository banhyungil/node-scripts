/**
 * 젠킨스 정보 추출 스크립트
 * */

import axios from 'axios'
import ExcelJS from 'exceljs'

// Jenkins API 응답 타입 정의
interface JenkinsBuild {
    number: number
    result: string
    duration: number
    timestamp: number
    changeSets?: JenkinsChangeSet[]
}

interface JenkinsChangeSet {
    items: JenkinsChangeItem[]
}

interface JenkinsChangeItem {
    msg: string
    author: {
        fullName: string
    }
    date: string
}

interface JenkinsApiResponse {
    builds: JenkinsBuild[]
}

interface BuildData {
    number: number
    result: string
    durationSec: string
    timestamp: string
    changes: string
    consoleLog?: string
}

// Jenkins 설정
const jenkinsServer = 'sakor042.cswind.com:21000'
const jobName = 'BATCH_PROD'
const JENKINS_URL = `http://${jenkinsServer}/job/${jobName}/api/json`
const USERNAME = 'admin' // 필요 시
const PASSWORD = 'AdminProd12*@!' // 필요 시

// 콘솔 로그 가져오기 함수
async function getConsoleLog(buildNumber: number): Promise<string> {
    try {
        const consoleUrl = `http://${jenkinsServer}/job/${jobName}/${buildNumber}/consoleText`
        const response = await axios.get<string>(consoleUrl, {
            auth: {
                username: USERNAME,
                password: PASSWORD,
            },
        })
        return response.data
    } catch (error) {
        console.error(
            `❌ 빌드 ${buildNumber} 콘솔 로그 가져오기 실패:`,
            error instanceof Error ? error.message : String(error)
        )
        return 'Failed to fetch console log'
    }
}

async function exportBuildHistory(): Promise<void> {
    try {
        // API 요청
        const response = await axios.get<JenkinsApiResponse>(JENKINS_URL, {
            auth: {
                username: USERNAME,
                password: PASSWORD,
            },
            params: {
                tree: 'builds[number,result,duration,timestamp,changeSets[items[msg,author[fullName],date]]]',
            },
        })

        const builds: BuildData[] = response.data.builds.map(
            (b: JenkinsBuild) => ({
                number: b.number,
                result: b.result,
                durationSec: (b.duration / 1000).toFixed(1),
                timestamp: new Date(b.timestamp).toLocaleString(),
                changes:
                    (b.changeSets || [])
                        .flatMap((cs: JenkinsChangeSet) =>
                            cs.items.map(
                                (item: JenkinsChangeItem) =>
                                    //   `${item.date} | ${item.author.fullName}: ${item.msg}`
                                    `${item.msg}`
                            )
                        )
                        .join('\n') || 'No Changes',
            })
        )

        // 실패한 빌드에 대해 콘솔 로그 가져오기
        console.log('📝 실패한 빌드의 콘솔 로그를 가져오는 중...')
        for (const build of builds) {
            if (build.result === 'FAILURE') {
                console.log(`  - 빌드 ${build.number} 콘솔 로그 가져오는 중...`)
                build.consoleLog = await getConsoleLog(build.number)
            }
        }

        // Excel Workbook 생성
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet('Build History')

        sheet.columns = [
            { header: '빌드 번호', key: 'number', width: 12 },
            { header: 'Result', key: 'result', width: 12 },
            { header: 'Duration (sec)', key: 'durationSec', width: 15 },
            { header: 'Timestamp', key: 'timestamp', width: 20 },
            { header: 'Changes', key: 'changes', width: 60 },
            { header: 'Console Log', key: 'consoleLog', width: 80 },
        ]

        builds.forEach((build: BuildData) => {
            const row = sheet.addRow(build)

            // Changes 셀에 wrapText 적용
            row.getCell('changes').alignment = { wrapText: true }

            // Console Log 셀에 wrapText 적용
            if (build.consoleLog) {
                row.getCell('consoleLog').alignment = { wrapText: true }
            }
        })

        await workbook.xlsx.writeFile(
            `jenkins_build_with_changes_${jobName.toLowerCase()}.xlsx`
        )
        console.log('✅ Jenkins 빌드 이력 + Changes 엑셀 저장 완료!')
    } catch (error) {
        console.error(
            '❌ 오류 발생:',
            error instanceof Error ? error.message : String(error)
        )
    }
}

exportBuildHistory()
