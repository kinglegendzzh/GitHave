# 代码分析报告

# 一、摘要



## 基础信息
- 仓库名称：cb
- 仓库描述：我的世界游戏插件（建筑构造器）
- 仓库分支：master
- 仓库地址：https://github.com/kinglegendzzh/cb
- 项目根路径：`/Users/apple/Public/generates-git/cb`
- 分析的目标子路径：`.`

## 函数信息
### onCommand (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
CraftBuilder插件为管理员和玩家提供来创建、编辑和管理自定义建筑的功能。它允许玩家选择方块区域并将其保存为YAML配置文件，可以设置文件的元数据，并重新生成建筑。此外，插件还提供了管理建筑文件的权限选项，确保只有授权用户才能进行修改和删除。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
file_exists,unlink,scandir,getName,isOp,sendMessage,getX,getY,getZ,getLevel,getFolderName,CreateFile,getDataFolder,get,Selection2,save,countBlocks,MakeNew,Selection,CreateNow,package,setAll,getAll,
- 内部依赖描述：
  - CreateFile: 该函数用于创建一个新的建筑配置文件，并返回相应的信息提示。
  - Selection2: 该函数用于从指定的起始和结束坐标中选择方块，并返回这些方块的详细信息。它首先获取指定世界的级别，然后计算并显示选定区域内的方块总数，接着遍历选定区域内的每个方块，获取其ID和伤害值，并将这些信息存储在一个三维数组中。
  - countBlocks: 计算在给定范围内的方块总数。
  - MakeNew: 该函数用于根据玩家输入的坐标创建一个新的临时文件，并将起点和终点信息保存在文件中。如果坐标在同一个世界中，函数将生成包含起点和终点信息的数组，并将其保存到ScratchFile.yml文件中。文件名与玩家名称相同。同时，函数还向玩家发送成功或错误的消息。
  - Selection: 该函数用于从指定的起点到终点范围内提取方块的数据，并返回这些方块的详细信息。
  - CreateNow: 该函数用于将一个剪贴板中的方块数据按照指定的位置偏移量放置到游戏世界中，返回实际成功放置的方块数量。
  - package: 将输入的玩家和方块数组打包，并修改方块数据，返回新的方块数组。


### onClick (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数实现了一个玩家交互系统，允许管理员设置起点和终点坐标以及生成地点。管理员使用木斧点击方块来设置生成地点，使用木锄点击方块来设定起点和终点坐标。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
getPlayer,getName,getItem,getBlock,getX,getY,getZ,getLevel,getFolderName,getId,isOp,sendMessage,setCancelled,
- 内部依赖描述：


### onEnable (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数是CraftBuilder插件的初始化方法，主要功能包括创建必要的文件夹、加载配置文件、注册事件监听器，并处理已存在的建筑文件。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
mkdir,scandir,str_replace,getDataFolder,getServer,getPluginManager,registerEvents,getLogger,info,get,
- 内部依赖描述：


### NewFile (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于保存玩家在指定区域选择的方块数据到 YAML 文件中，并在文件中记录起始和终点坐标、服务器IP地址和端口，以及服务器描述信息和联系方式。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
getServer,getLevelByName,countBlocks,getBlock,getID,getDamage,getDataFolder,save,sendMessage,getIp,getPort,get,
- 内部依赖描述：
  - countBlocks: 计算在给定范围内的方块总数。


### onJoin (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数实现了一个在玩家加入服务器时，如果该玩家具有OP权限，则会展示服务器中所有建筑文件的信息，包括服务器描述和建筑文件描述。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
scandir,str_replace,getPlayer,isOp,sendMessage,getDataFolder,get,
- 内部依赖描述：


### Selection2 (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于从指定的起始和结束坐标中选择方块，并返回这些方块的详细信息。它首先获取指定世界的级别，然后计算并显示选定区域内的方块总数，接着遍历选定区域内的每个方块，获取其ID和伤害值，并将这些信息存储在一个三维数组中。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
getServer,getLevelByName,countBlocks,sendMessage,getBlock,getID,getDamage,
- 内部依赖描述：
  - countBlocks: 计算在给定范围内的方块总数。


### Selection (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于从指定的起点到终点范围内提取方块的数据，并返回这些方块的详细信息。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
getServer,getLevelByName,countBlocks,sendMessage,getBlock,getID,getDamage,
- 内部依赖描述：
  - countBlocks: 计算在给定范围内的方块总数。


### CreateNow (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于将一个剪贴板中的方块数据按照指定的位置偏移量放置到游戏世界中，返回实际成功放置的方块数量。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
array_map,getX,getY,getZ,getLevel,setBlock,
- 内部依赖描述：


### CreateFile (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于创建一个新的建筑配置文件，并返回相应的信息提示。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
file_exists,getDataFolder,NewFile,
- 内部依赖描述：
  - NewFile: 该函数用于保存玩家在指定区域选择的方块数据到 YAML 文件中，并在文件中记录起始和终点坐标、服务器IP地址和端口，以及服务器描述信息和联系方式。


### MakeNew (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
该函数用于根据玩家输入的坐标创建一个新的临时文件，并将起点和终点信息保存在文件中。如果坐标在同一个世界中，函数将生成包含起点和终点信息的数组，并将其保存到ScratchFile.yml文件中。文件名与玩家名称相同。同时，函数还向玩家发送成功或错误的消息。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
getName,save,sendMessage,
- 内部依赖描述：


### onDisable (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
清除临时文件的数据。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
setAll,save,
- 内部依赖描述：


### package (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
将输入的玩家和方块数组打包，并修改方块数据，返回新的方块数组。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,
- 调用：
sendMessage,
- 内部依赖描述：


### countBlocks (CraftBuilder/src/CraftBuilder/CraftBuilder.php)
- 所属模块/包：`namespace CraftBuilder;`
- 函数类型：function
- 功能描述：
计算在给定范围内的方块总数。


- 引入包：
pocketmine\Player,pocketmine\block\Air,pocketmine\block\Block,pocketmine\event\Listener,pocketmine\plugin\PluginBase,pocketmine\event\player\PlayerInteractEvent,pocketmine\event\player\PlayerJoinEvent,pocketmine\event\block\BlockBreakEvent,pocketmine\inventory\PlayerInventory,pocketmine\level\Position,pocketmine\level\Level,pocketmine\item\Item,pocketmine\math\Vector3,pocketmine\command\Command,pocketmine\command\CommandSender,pocketmine\utils\TextFormat,pocketmine\utils\Config,



### cb (.)





### .DS_Store (.DS_Store)





### CraftBuilder (CraftBuilder)





### plugin.yml (CraftBuilder/plugin.yml)





### src (CraftBuilder/src)





### CraftBuilder (CraftBuilder/src/CraftBuilder)





### README.md (README.md)







# 二、分析明细



 ```mermaid
graph LR
    A[cb] --> B[CraftBuilder]
    B --> C[README.md]
    B --> D[plugin.yml]
    B --> E[src]
    E --> F[CraftBuilder]
    F --> G[CraftBuilder.php]

    G --> H[onCommand]
    G --> I[onClick]
    G --> J[onEnable]
    G --> K[onJoin]
    G --> L[onDisable]
    G --> M[NewFile]
    G --> N[Selection]
    G --> O[Selection2]
    G --> P[CreateNow]
    G --> Q[CreateFile]
    G --> R[MakeNew]
    G --> S[package]
    G --> T[countBlocks]
```

