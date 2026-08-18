# PlantUML 语法测试文档

> 本文档用于测试 ErgeMD 的 PlantUML 语法兼容功能。
> 支持 ` ```plantuml ` 和 ` ```puml ` 代码块。

## 1. 序列图 (Sequence Diagram)

### 基本序列图

```plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml
```

### 带参与者的序列图

```plantuml
@startuml
actor User
participant "Web Server" as WS
participant "Auth Service" as AS
database "Database" as DB

User -> WS: POST /login
WS -> AS: validateCredentials
AS -> DB: SELECT user
DB --> AS: user record
alt valid credentials
    AS --> WS: JWT token
else invalid
    AS --> WS: 401 Unauthorized
end
WS --> User: Response
@enduml
```

## 2. 类图 (Class Diagram)

```plantuml
@startuml
class Animal {
    +String name
    +int age
    +makeSound()
}
class Dog {
    +String breed
    +bark()
}
class Cat {
    +boolean indoor
    +meow()
}

Animal <|-- Dog
Animal <|-- Cat
@enduml
```

## 3. 活动图 (Activity Diagram)

```plantuml
@startuml
start
:用户登录;
if (验证成功?) then (yes)
    :进入首页;
else (no)
    :显示错误提示;
endif
stop
@enduml
```

## 4. 组件图 (Component Diagram)

```plantuml
@startuml
package "Frontend" {
    [React App]
}
package "Backend" {
    [API Server]
    [Auth Service]
}
package "Database" {
    database PostgreSQL
}

[React App] --> [API Server]
[API Server] --> [Auth Service]
[API Server] --> PostgreSQL
[Auth Service] --> PostgreSQL
@enduml
```

## 5. 状态图 (State Diagram)

```plantuml
@startuml
[*] --> Idle
Idle --> Loading : fetch data
Loading --> Success : data loaded
Loading --> Error : request failed
Success --> Idle : reset
Error --> Idle : retry
Idle --> [*]
@enduml
```

## 6. 对象图 (Object Diagram)

```plantuml
@startuml
object London {
    name = "London"
    country = "UK"
}
object Paris {
    name = "Paris"
    country = "France"
}
object Tokyo {
    name = "Tokyo"
    country = "Japan"
}

London --> Paris : 340 km
London --> Tokyo : 9600 km
Paris --> Tokyo : 9700 km
@enduml
```

## 7. 用例图 (Use Case Diagram)

```plantuml
@startuml
left to right direction
actor Customer
actor Admin

rectangle "Online Shop" {
    usecase "Browse Products" as UC1
    usecase "Add to Cart" as UC2
    usecase "Checkout" as UC3
    usecase "Manage Products" as UC4
}

Customer --> UC1
Customer --> UC2
Customer --> UC3
Admin --> UC4
UC2 --> UC3
@enduml
```

## 8. 部署图 (Deployment Diagram)

```plantuml
@startuml
node "Client" as client {
    [Browser]
}
node "Web Server" as server {
    [App Server]
    [Static Files]
}
node "Database Server" as db {
    database "PostgreSQL"
}

[Browser] --> [App Server] : HTTPS
[App Server] --> PostgreSQL : TCP/IP
@enduml
```

## 9. 时序图/时序图 (Timing Diagram)

```plantuml
@startuml
robust "Web Browser" as WB
concise "Web User" as WU

@WB
0 is Waiting
100 is Processing
200 is Idle

@WU
0 is Present
100 is Idle
200 is Absent
@enduml
```

## 10. 网络图 (Network Diagram)

```plantuml
@startuml
node "Client" as client {
    [Browser]
}
node "DMZ Network" as dmz {
    [Web Server 1]
    [Web Server 2]
}
node "Internal Network" as internal {
    [App Server]
    database "DB Server"
}

[Browser] --> [Web Server 1] : HTTPS
[Browser] --> [Web Server 2] : HTTPS
[Web Server 1] --> [App Server] : API
[Web Server 2] --> [App Server] : API
[App Server] --> [DB Server] : TCP/IP
@enduml
```

## 11. ER 图 (Entity Relationship Diagram)

```plantuml
@startuml
entity "User" as user {
    *id : BIGINT <<PK>>
    --
    name : VARCHAR
    email : VARCHAR
}

entity "Order" as order {
    *id : BIGINT <<PK>>
    --
    user_id : BIGINT <<FK>>
    total : DECIMAL
}

user ||--o{ order
@enduml
```

## 12. 思维导图 (Mindmap)

```plantuml
@startmindmap
* ErgeMD
** Markdown 渲染
*** GFM 语法
*** 数学公式
*** 代码高亮
** 图表支持
*** Mermaid
*** PlantUML
** 阅读体验
*** 虚拟滚动
*** 多主题
*** 进度追踪
@endmindmap
```

## 13. WBS 工作分解结构 (Work Breakdown Structure)

> 甘特图（`gantt`）和 `@startgantt` 均不被 `@plantuml/core` 支持，此处替换为 WBS 图。

```plantuml
@startwbs
* ErgeMD Project
** Core
*** Markdown Rendering
*** File Management
** Charts
*** Mermaid Support
*** PlantUML Support
** Release
*** Testing
*** Deployment
@endwbs
```

## 14. 反馈图 (Salt/Wireframe 替代)

> Wireframe / Salt 语法（`@startsalt`）和归档图（`archive`）均不被 `@plantuml/core` 支持，此处使用反馈图替代。

```plantuml
@startuml
usecase "用户反馈" as feedback
usecase "提交 Bug" as bug
usecase "功能建议" as feature
usecase "评分" as rating

actor "用户" as user
actor "开发团队" as dev

user --> feedback
feedback --> bug
feedback --> feature
feedback --> rating
bug --> dev
feature --> dev
@enduml
```

## 15. JSON 数据可视化

```plantuml
@startjson
{
    "name": "ErgeMD",
    "version": "1.0.0",
    "features": ["Markdown", "Mermaid", "PlantUML"],
    "settings": {
        "theme": "dark",
        "fontSize": 16
    }
}
@endjson
```

## 16. YAML 数据可视化

```plantuml
@startyaml
name: ErgeMD
version: 1.0.0
features:
  - Markdown
  - Mermaid
  - PlantUML
settings:
  theme: dark
  fontSize: 16
@endyaml
```

## 与 Mermaid 共存测试

下面的 Mermaid 图表应该正常渲染：

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Fix it]
    D --> B
```

> 如果 Mermaid 图表正常显示，说明两种图表系统共存正常。

## PlantUML 与 Mermaid 语法对比

| 特性 | PlantUML | Mermaid |
|------|----------|---------|
| 代码块标识 | ` ```plantuml ` | ` ```mermaid ` |
| 序列图箭头 | `->`, `-->` | `->>`, `-->>` |
| 参与者声明 | `participant` | 自动推断 |
| 条件分支 | `alt/else/end` | `alt/else` |

## 注意事项

1. PlantUML 代码块必须以 `@startuml` 开头，`@enduml` 结尾
2. 特殊图表类型使用独立标签：`@startmindmap`/`@endmindmap`、`@startjson`/`@endjson`、`@startyaml`/`@endyaml`、`@startwbs`/`@endwbs` 等
3. 渲染采用串行队列，多个图表会依次渲染
4. 以下语法不被 `@plantuml/core` 支持：
   - `nwdiag` 网络图扩展 → 请使用部署图（node）语法替代
   - `gantt` / `@startgantt` 甘特图 → 请使用 WBS 图替代
   - `@startsalt`/`@endsalt`（Wireframe）→ 暂无替代方案
   - `archive` 归档图 → 暂无替代方案
