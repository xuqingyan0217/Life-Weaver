Supervisor Agent 是一种中心化多 Agent 协作模式，由一个监督者（Supervisor Agent） 和多个子 Agent（SubAgents）组成。
Supervisor 负责任务的分配、子 Agent 执行过程的监控，以及子 Agent 完成后的结果汇总与下一步决策；
子 Agent 则专注于执行具体任务，并在完成后通过 WithDeterministicTransferTo 自动将任务控制权交回 Supervisor。

该处的agent配置了两个带有工具的agent，分别是search和execute。
同时把二者添加到一个主智能体中，整体类似于前面的transfer，只不过不一样的是，子agent在任务执行完毕后，也会通过一个类似transfer机制返回到主agent，
而前面看到的transfer，仅仅是主agent到子agent的单项通道，而supervisor的transfer机制，是双向的，不仅任务分配时会transfer，
子agent在任务执行完毕后，也会通过transfer机制返回到主agent。

WithDeterministicTransferTo 是 Eino ADK 提供的 Agent 增强工具，用于为 Agent 注入任务转让（Transfer）能力 。
它允许开发者为目标 Agent 预设固定的任务转让路径，当该 Agent 完成任务（未被中断）时，会自动生成 Transfer 事件，
将任务流转到预设的目标 Agent。

这一能力是构建 Supervisor Agent 协作模式的基础，确保子 Agent 在执行完毕后能可靠地将任务控制权交回监督者（Supervisor），
形成“分配-执行-反馈”的闭环协作流程。

事实上其内部实现也就是如此