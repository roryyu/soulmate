"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
export default function testPage() {
    console.log('testPage',new Date().getTime())
    const params = useParams()
    const projectId = params.projectId as string
    console.log('projectId',projectId)
const isLoaded = useRef(false)

  const loadDocuments = useCallback(async () => {
        console.log('first',projectId)
   }, [projectId])

   useEffect(() => {
    if (!isLoaded.current) {
      loadDocuments()
      isLoaded.current = true
    }
  }, [loadDocuments])

    return <div>testPage 123</div>
}