import { useEffect, useRef, useState } from 'react'
import type { ReadingRecord } from '../domain/tarot'
import {
  hydrateReadingRecordsFromDatabase,
  persistReadingRecordsToDatabase,
} from '../engine/recordDatabase'
import {
  exportReadingRecordsJson,
  loadReadingRecords,
  mergeReadingRecords,
  parseReadingRecordsJson,
  saveReadingRecord,
} from '../engine/storage'

export const usePersistentRecords = () => {
  const [records, setRecords] = useState<ReadingRecord[]>(() => loadReadingRecords())
  const [storageReady, setStorageReady] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    void hydrateReadingRecordsFromDatabase().then((result) => {
      if (!mountedRef.current) {
        return
      }

      setRecords(result.records)
      setStorageReady(true)
    })

    return () => {
      mountedRef.current = false
    }
  }, [])

  const persistRecords = (nextRecords: ReadingRecord[]) => {
    setRecords(nextRecords)

    void persistReadingRecordsToDatabase(nextRecords).then((result) => {
      if (!mountedRef.current) {
        return
      }

      setStorageReady(true)
      setRecords(result.records)
    })

    return nextRecords
  }

  const upsertRecord = (record: ReadingRecord) => {
    const nextRecords = saveReadingRecord(record)
    return persistRecords(nextRecords)
  }

  const importRecordsFromText = async (raw: string) => {
    const importedRecords = parseReadingRecordsJson(raw)
    const nextRecords = mergeReadingRecords([...importedRecords, ...records])
    persistRecords(nextRecords)
    return importedRecords.length
  }

  return {
    records,
    storageReady,
    exportRecordsJson: () => exportReadingRecordsJson(records),
    importRecordsFromText,
    persistRecords,
    upsertRecord,
  }
}
