项目经理 (ProjectManagerAgent) [监督者]
├── 研究代理 (ResearchAgent)
├── 代码代理 (CodeAgent)
└── 审查代理 (ReviewAgent)
    ├── 问题分析代理 (question_analysis_agent)
    ├── 审查生成代理 (generate_review_agent)
    └── 审查验证代理 (review_validation_agent)

其中reviewer这个agent内部又是三个子agent；整体reviewer是一个supervisor

其它两个agent