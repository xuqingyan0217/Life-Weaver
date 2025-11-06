import { useEffect } from 'react'
import { defaultUserModuleDefs } from '../components/defs/registry.jsx'

// 初次合并恢复的用户模板定义到运行时状态
export function useMergeUserDefs(mergedUserDefs, setUserModuleDefs) {
  useEffect(() => {
    if (mergedUserDefs && mergedUserDefs !== defaultUserModuleDefs) {
      setUserModuleDefs(prev => ({ ...mergedUserDefs, ...prev }))
    }
  }, [])
}