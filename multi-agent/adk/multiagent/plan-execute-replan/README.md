plan-execute-replan的模式
非常适合做一些旅游规划方面的内容，我们之前是有使用graph做过的，现在采用adk来做

plan-execute-replan/
├── agent/
│   └── agent.go           # 定义三个核心智能体：计划者、执行者和重新计划者
├── tools/
│   ├── ask_for_clarification.go  # 请求澄清工具
│   └── travel_tools.go           # 旅行相关工具集
└── plan-execute-replan.go        # 主程序入口

其中这三个agent都是直接调用封装好的一个方法，
我们只需要传入一个大模型就可以返回一个用于replan的智能体了；
其中澄清工具是直接在工具内部触发用户输入，不在是靠循环来中断了，更加简单；



