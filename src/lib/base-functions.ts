// src/lib/base-functions.ts
import type { Node, Port } from '@/types/flow';
// import { nanoid } from '@/lib/nanoid'; // nanoid不再用于基础函数端口ID
import { parsePythonFunction } from './python-parser';

interface BaseFunctionDef {
  name: string;
  description: string;
  code: string;
  dependencies?: string[];
}

const rawBaseFunctions: BaseFunctionDef[] = [
  {
    name: 'RD',
    description: '四舍五入取N位小数',
    code: `import numpy as np
def RD(N,D=3): #四舍五入取3位小数 
  return np.round(N,D)`,
    dependencies: ['numpy'],
  },
  {
    name: 'RET',
    description: '返回序列倒数第N个值,默认返回最后一个',
    code: `import numpy as np
def RET(S,N=1): #返回序列倒数第N个值,默认返回最后一个
  return np.array(S)[-N]`,
    dependencies: ['numpy'],
  },
  {
    name: 'ABS',
    description: '返回N的绝对值',
    code: `import numpy as np
def ABS(S): #返回N的绝对值
  return np.abs(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'LN',
    description: '求底是e的自然对数',
    code: `import numpy as np
def LN(S): #求底是e的自然对数,
  return np.log(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'POW',
    description: '求S的N次方',
    code: `import numpy as np
def POW(S,N): #求S的N次方
  return np.power(S,N)`,
    dependencies: ['numpy'],
  },
  {
    name: 'SQRT',
    description: '求S的平方根',
    code: `import numpy as np
def SQRT(S): #求S的平方根
  return np.sqrt(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'SIN',
    description: '求S的正弦值（弧度)',
    code: `import numpy as np
def SIN(S): #求S的正弦值（弧度)
  return np.sin(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'COS',
    description: '求S的余弦值（弧度)',
    code: `import numpy as np
def COS(S): #求S的余弦值（弧度)
  return np.cos(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'TAN',
    description: '求S的正切值（弧度)',
    code: `import numpy as np
def TAN(S): #求S的正切值（弧度)  
  return np.tan(S)`,
    dependencies: ['numpy'],
  },
  {
    name: 'MAX',
    description: '序列max',
    code: `import numpy as np
def MAX(S1,S2): #序列max
  return np.maximum(S1,S2)`,
    dependencies: ['numpy'],
  },
  {
    name: 'MIN',
    description: '序列min',
    code: `import numpy as np
def MIN(S1,S2): #序列min
  return np.minimum(S1,S2)`,
    dependencies: ['numpy'],
  },
  {
    name: 'IF',
    description: '序列布尔判断 return=A if S==True else B',
    code: `import numpy as np
def IF(S,A,B): #序列布尔判断 return=A  if S==True  else  B
  return np.where(S,A,B)`,
    dependencies: ['numpy'],
  },
  {
    name: 'REF',
    description: '对序列整体下移动N,返回序列(shift后会产生NAN)',
    code: `import pandas as pd
def REF(S, N=1): #对序列整体下移动N,返回序列(shift后会产生NAN)    
    return pd.Series(S).shift(N).values`,
    dependencies: ['pandas'],
  },
  {
    name: 'DIFF',
    description: '前一个值减后一个值,前面会产生nan',
    code: `import pandas as pd
def DIFF(S, N=1): #前一个值减后一个值,前面会产生nan 
    return pd.Series(S).diff(N).values #np.diff(S)直接删除nan，会少一行`,
    dependencies: ['pandas'],
  },
  {
    name: 'STD',
    description: '求序列的N日标准差，返回序列',
    code: `import pandas as pd
def STD(S,N): #求序列的N日标准差，返回序列    
    return  pd.Series(S).rolling(N).std(ddof=0).values`,
    dependencies: ['pandas'],
  },
  {
    name: 'SUM',
    description: '对序列求N天累计和，返回序列 N=0对序列所有依次求和',
    code: `import pandas as pd
def SUM(S, N): #对序列求N天累计和，返回序列    N=0对序列所有依次求和         
    return pd.Series(S).rolling(N).sum().values if N>0 else pd.Series(S).cumsum().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'CONST',
    description: '返回序列S最后的值组成常量序列',
    code: `import numpy as np
def CONST(S): #返回序列S最后的值组成常量序列
  return np.full(len(S),S[-1])`,
    dependencies: ['numpy'],
  },
  {
    name: 'HHV',
    description: 'HHV(C, 5) 最近5天收盘最高价',
    code: `import pandas as pd
def HHV(S,N): #HHV(C, 5) 最近5天收盘最高价        
    return pd.Series(S).rolling(N).max().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'LLV',
    description: 'LLV(C, 5) 最近5天收盘最低价',
    code: `import pandas as pd
def LLV(S,N): #LLV(C, 5) 最近5天收盘最低价     
    return pd.Series(S).rolling(N).min().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'HHVBARS',
    description: '求N周期内S最高值到当前周期数, 返回序列',
    code: `import pandas as pd
import numpy as np
def HHVBARS(S,N): #求N周期内S最高值到当前周期数, 返回序列
    return pd.Series(S).rolling(N).apply(lambda x: np.argmax(x[::-1]),raw=True).values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'LLVBARS',
    description: '求N周期内S最低值到当前周期数, 返回序列',
    code: `import pandas as pd
import numpy as np
def LLVBARS(S,N): #求N周期内S最低值到当前周期数, 返回序列
    return pd.Series(S).rolling(N).apply(lambda x: np.argmin(x[::-1]),raw=True).values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'MA',
    description: '求序列的N日简单移动平均值，返回序列',
    code: `import pandas as pd
def MA(S,N): #求序列的N日简单移动平均值，返回序列                    
    return pd.Series(S).rolling(N).mean().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'EMA',
    description: '指数移动平均,为了精度 S>4*N EMA至少需要120周期 alpha=2/(span+1)',
    code: `import pandas as pd
def EMA(S,N): #指数移动平均,为了精度 S>4*N  EMA至少需要120周期     alpha=2/(span+1)    
    return pd.Series(S).ewm(span=N, adjust=False).mean().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'SMA',
    description: '中国式的SMA,至少需要120周期才精确 (雪球180周期) alpha=1/(1+com)',
    code: `import pandas as pd
def SMA(S, N, M=1): #中国式的SMA,至少需要120周期才精确 (雪球180周期)    alpha=1/(1+com) # com=N-M/M
    return pd.Series(S).ewm(alpha=M/N,adjust=False).mean().values`,
    dependencies: ['pandas'],
  },
  {
    name: 'WMA',
    description: '通达信S序列的N日加权移动平均 Yn = (1*X1+2*X2+3*X3+...+n*Xn)/(1+2+3+...+Xn)',
    code: `import pandas as pd
def WMA(S, N): #通达信S序列的N日加权移动平均 Yn = (1*X1+2*X2+3*X3+...+n*Xn)/(1+2+3+...+Xn)
    return pd.Series(S).rolling(N).apply(lambda x:x[::-1].cumsum().sum()*2/N/(N+1),raw=True).values`,
    dependencies: ['pandas'],
  },
  {
    name: 'DMA',
    description: '求S的动态移动平均，A作平滑因子,必须 0<A<1 (此为核心函数，非指标）',
    code: `import pandas as pd
import numpy as np
def DMA(S, A): #求S的动态移动平均，A作平滑因子,必须 0<A<1  (此为核心函数，非指标） #A支持序列 by jqz1226
    if isinstance(A,(int,float)):  return pd.Series(S).ewm(alpha=A,adjust=False).mean().values    
    A=np.array(A);   A[np.isnan(A)]=1.0;   Y= np.zeros(len(S));   Y[0]=S[0]     
    for i in range(1,len(S)): Y[i]=A[i]*S[i]+(1-A[i])*Y[i-1]             
    return Y`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'AVEDEV',
    description: '平均绝对偏差 (序列与其平均值的绝对差的平均值)',
    code: `import pandas as pd
import numpy as np
def AVEDEV(S, N): #平均绝对偏差  (序列与其平均值的绝对差的平均值)   
    return pd.Series(S).rolling(N).apply(lambda x: (np.abs(x - x.mean())).mean()).values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'SLOPE',
    description: '返S序列N周期回线性回归斜率',
    code: `import pandas as pd
import numpy as np
def SLOPE(S, N): #返S序列N周期回线性回归斜率            
    return pd.Series(S).rolling(N).apply(lambda x: np.polyfit(range(N),x,deg=1)[0],raw=True).values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'FORCAST',
    description: '返回S序列N周期回线性回归后的预测值， jqz1226改进成序列出',
    code: `import pandas as pd
import numpy as np
def FORCAST(S, N): #返回S序列N周期回线性回归后的预测值， jqz1226改进成序列出    
    return pd.Series(S).rolling(N).apply(lambda x:np.polyval(np.polyfit(range(N),x,deg=1),N-1),raw=True).values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'LAST',
    description: '从前A日到前B日一直满足S_BOOL条件, 要求A>B & A>0 & B>=0',
    code: `import pandas as pd
import numpy as np
def LAST(S, A, B): #从前A日到前B日一直满足S_BOOL条件, 要求A>B & A>0 & B>=0 
    return np.array(pd.Series(S).rolling(A+1).apply(lambda x:np.all(x[::-1][B:]),raw=True),dtype=bool)`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'COUNT',
    description: 'COUNT(CLOSE>O, N): 最近N天满足S_BOO的天数 True的天数',
    code: `from .SUM import SUM # 依赖SUM函数
def COUNT(S, N): # COUNT(CLOSE>O, N):  最近N天满足S_BOO的天数  True的天数
    return SUM(S,N)`,
    dependencies: ['SUM'],
  },
  {
    name: 'EVERY',
    description: 'EVERY(CLOSE>O, 5) 最近N天是否都是True',
    code: `from .SUM import SUM # 依赖SUM函数
from .IF import IF # 依赖IF函数
def EVERY(S, N): # EVERY(CLOSE>O, 5)   最近N天是否都是True
    return  IF(SUM(S,N)==N,True,False)`,
    dependencies: ['SUM', 'IF'],
  },
  {
    name: 'EXIST',
    description: 'EXIST(CLOSE>3010, N=5) n日内是否存在一天大于3000点',
    code: `from .SUM import SUM # 依赖SUM函数
from .IF import IF # 依赖IF函数
def EXIST(S, N): # EXIST(CLOSE>3010, N=5)  n日内是否存在一天大于3000点  
    return IF(SUM(S,N)>0,True,False)`,
    dependencies: ['SUM', 'IF'],
  },
  {
    name: 'FILTER',
    description: 'FILTER函数，S满足条件后，将其后N周期内的数据置为0, FILTER(C==H,5)',
    code: `def FILTER(S, N): # 例：FILTER(C==H,5) 涨停后，后5天不再发出信号
  for i in range(len(S)): S[i+1:i+1+N]=0  if S[i] else S[i+1:i+1+N]        
  return S`,
    dependencies: [],
  },
  {
    name: 'BARSLAST',
    description: '上一次条件成立到当前的周期, BARSLAST(C/REF(C,1)>=1.1) 上一次涨停到今天的天数',
    code: `import numpy as np
def BARSLAST(S): #上一次条件成立到当前的周期, BARSLAST(C/REF(C,1)>=1.1) 上一次涨停到今天的天数 
    M=np.concatenate(([0],np.where(S,1,0)))  
    for i in range(1, len(M)):  M[i]=0 if M[i] else M[i-1]+1    
    return M[1:]`,
    dependencies: ['numpy'],
  },
  {
    name: 'BARSLASTCOUNT',
    description: '统计连续满足S条件的周期数 by jqz1226',
    code: `import numpy as np
def BARSLASTCOUNT(S): # BARSLASTCOUNT(CLOSE>OPEN)表示统计连续收阳的周期数
  rt = np.zeros(len(S)+1)            
  for i in range(len(S)): rt[i+1]=rt[i]+1  if S[i] else rt[i+1]
  return rt[1:]`,
    dependencies: ['numpy'],
  },
  {
    name: 'BARSSINCEN',
    description: 'N周期内第一次S条件成立到现在的周期数,N为常量 by jqz1226',
    code: `import pandas as pd
import numpy as np
def BARSSINCEN(S, N): # N周期内第一次S条件成立到现在的周期数,N为常量  by jqz1226
  return pd.Series(S).rolling(N).apply(lambda x:N-1-np.argmax(x) if np.argmax(x) or x[0] else 0,raw=True).fillna(0).values.astype(int)`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'CROSS',
    description: '判断向上金叉穿越 CROSS(MA(C,5),MA(C,10)) 判断向下死叉穿越 CROSS(MA(C,10),MA(C,5))',
    code: `import numpy as np
def CROSS(S1, S2): # 判断向上金叉穿越 CROSS(MA(C,5),MA(C,10))  判断向下死叉穿越 CROSS(MA(C,10),MA(C,5))    # 不使用0级函数,移植方便  by jqz1226
    return np.concatenate(([False], np.logical_not((S1>S2)[:-1]) & (S1>S2)[1:]))`,
    dependencies: ['numpy'],
  },
  {
    name: 'LONGCROSS',
    description: '两条线维持一定周期后交叉,S1在N周期内都小于S2,本周期从S1下方向上穿过S2时返回1,否则返回0',
    code: `import numpy as np
from .LAST import LAST # 依赖LAST函数
def LONGCROSS(S1,S2,N): # 两条线维持一定周期后交叉,S1在N周期内都小于S2,本周期从S1下方向上穿过S2时返回1,否则返回0 # N=1时等同于CROSS(S1, S2)
  return  np.array(np.logical_and(LAST(S1<S2,N,1),(S1>S2)),dtype=bool)`,
    dependencies: ['numpy', 'LAST'],
  },
  {
    name: 'VALUEWHEN',
    description: '当S条件成立时,取X的当前值,否则取VALUEWHEN的上个成立时的X值 by jqz1226',
    code: `import pandas as pd
import numpy as np
def VALUEWHEN(S, X): # 当S条件成立时,取X的当前值,否则取VALUEWHEN的上个成立时的X值   by jqz1226
  return pd.Series(np.where(S,X,np.nan)).ffill().values`,
    dependencies: ['pandas', 'numpy'],
  },
  {
    name: 'BETWEEN',
    description: 'S处于A和B之间时为真。 包括 A<S<B 或 A>S>B',
    code: `def BETWEEN(S, A, B): # S处于A和B之间时为真。 包括 A<S<B 或 A>S>B
  return ((A<S) & (S<B)) | ((A>S) & (S>B))`,
    dependencies: [],
  },
  {
    name: 'TOPRANGE',
    description: 'TOPRANGE(HIGH)表示当前最高价是近多少周期内最高价的最大值 by jqz1226',
    code: `import numpy as np
def TOPRANGE(S): # TOPRANGE(HIGH)表示当前最高价是近多少周期内最高价的最大值 by jqz1226
  rt = np.zeros(len(S))
  for i in range(1,len(S)):  rt[i] = np.argmin(np.flipud(S[:i]<S[i]))
  return rt.astype('int')`,
    dependencies: ['numpy'],
  },
  {
    name: 'LOWRANGE',
    description: 'LOWRANGE(LOW)表示当前最低价是近多少周期内最低价的最小值 by jqz1226',
    code: `import numpy as np
def LOWRANGE(S): # LOWRANGE(LOW)表示当前最低价是近多少周期内最低价的最小值 by jqz1226
  rt = np.zeros(len(S))
  for i in range(1,len(S)):  rt[i] = np.argmin(np.flipud(S[:i]>S[i]))
  return rt.astype('int')`,
    dependencies: ['numpy'],
  },
  {
    name: 'MACD',
    description: 'EMA的关系，S取120日，和雪球小数点2位相同',
    code: `from .EMA import EMA # 依赖EMA函数
from .RD import RD # 依赖RD函数
def MACD(CLOSE,SHORT=12,LONG=26,M=9): # EMA的关系，S取120日，和雪球小数点2位相同
    DIF = EMA(CLOSE,SHORT)-EMA(CLOSE,LONG);  
    DEA = EMA(DIF,M);      MACD=(DIF-DEA)*2
    return RD(DIF),RD(DEA),RD(MACD)`,
    dependencies: ['EMA', 'RD'],
  },
  {
    name: 'KDJ',
    description: 'KDJ指标',
    code: `from .LLV import LLV # 依赖LLV函数
from .HHV import HHV # 依赖HHV函数
from .EMA import EMA # 依赖EMA函数
def KDJ(CLOSE,HIGH,LOW, N=9,M1=3,M2=3): # KDJ指标
  RSV = (CLOSE - LLV(LOW, N)) / (HHV(HIGH, N) - LLV(LOW, N)) * 100
  K = EMA(RSV, (M1*2-1));    D = EMA(K,(M2*2-1));        J=K*3-D*2
  return K, D, J`,
    dependencies: ['LLV', 'HHV', 'EMA'],
  },
  {
    name: 'RSI',
    description: 'RSI指标,和通达信小数点2位相同',
    code: `from .REF import REF # 依赖REF函数
from .MAX import MAX # 依赖MAX函数
from .SMA import SMA # 依赖SMA函数
from .ABS import ABS # 依赖ABS函数
from .RD import RD # 依赖RD函数
def RSI(CLOSE, N=24): # RSI指标,和通达信小数点2位相同
  DIF = CLOSE-REF(CLOSE,1) 
  return RD(SMA(MAX(DIF,0), N) / SMA(ABS(DIF), N) * 100)`,
    dependencies: ['REF', 'MAX', 'SMA', 'ABS', 'RD'],
  },
  {
    name: 'WR',
    description: 'W&R 威廉指标',
    code: `from .HHV import HHV # 依赖HHV函数
from .LLV import LLV # 依赖LLV函数
from .RD import RD # 依赖RD函数
def WR(CLOSE, HIGH, LOW, N=10, N1=6): #W&R 威廉指标
    WR = (HHV(HIGH, N) - CLOSE) / (HHV(HIGH, N) - LLV(LOW, N)) * 100
    WR1 = (HHV(HIGH, N1) - CLOSE) / (HHV(HIGH, N1) - LLV(LOW, N1)) * 100
    return RD(WR), RD(WR1)`,
    dependencies: ['HHV', 'LLV', 'RD'],
  },
  {
    name: 'BIAS',
    description: 'BIAS乖离率',
    code: `from .MA import MA # 依赖MA函数
from .RD import RD # 依赖RD函数
def BIAS(CLOSE,L1=6, L2=12, L3=24): # BIAS乖离率
    BIAS1 = (CLOSE - MA(CLOSE, L1)) / MA(CLOSE, L1) * 100
    BIAS2 = (CLOSE - MA(CLOSE, L2)) / MA(CLOSE, L2) * 100
    BIAS3 = (CLOSE - MA(CLOSE, L3)) / MA(CLOSE, L3) * 100
    return RD(BIAS1), RD(BIAS2), RD(BIAS3)`,
    dependencies: ['MA', 'RD'],
  },
  {
    name: 'BOLL',
    description: 'BOLL指标，布林带',
    code: `from .MA import MA # 依赖MA函数
from .STD import STD # 依赖STD函数
from .RD import RD # 依赖RD函数
def BOLL(CLOSE,N=20, P=2): #BOLL指标，布林带    
    MID = MA(CLOSE, N); 
    UPPER = MID + STD(CLOSE, N) * P
    LOWER = MID - STD(CLOSE, N) * P
    return RD(UPPER), RD(MID), RD(LOWER)`,
    dependencies: ['MA', 'STD', 'RD'],
  },
  {
    name: 'PSY',
    description: 'PSY心理线指标',
    code: `from .COUNT import COUNT # 依赖COUNT函数
from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
from .RD import RD # 依赖RD函数
def PSY(CLOSE,N=12, M=6): #PSY心理线指标
  PSY_VAL=COUNT(CLOSE>REF(CLOSE,1),N)/N*100 # 变量名PSY与函数名PSY冲突，修改为PSY_VAL
  PSYMA=MA(PSY_VAL,M)
  return RD(PSY_VAL),RD(PSYMA)`,
    dependencies: ['COUNT', 'REF', 'MA', 'RD'],
  },
  {
    name: 'CCI',
    description: 'CCI顺势指标',
    code: `from .MA import MA # 依赖MA函数
from .AVEDEV import AVEDEV # 依赖AVEDEV函数
def CCI(CLOSE,HIGH,LOW,N=14): #CCI顺势指标
  TP=(HIGH+LOW+CLOSE)/3
  return (TP-MA(TP,N))/(0.015*AVEDEV(TP,N))`,
    dependencies: ['MA', 'AVEDEV'],
  },
  {
    name: 'ATR',
    description: '真实波动N日平均值',
    code: `from .MAX import MAX # 依赖MAX函数
from .ABS import ABS # 依赖ABS函数
from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
def ATR(CLOSE,HIGH,LOW, N=20): #真实波动N日平均值
  TR = MAX(MAX((HIGH - LOW), ABS(REF(CLOSE, 1) - HIGH)), ABS(REF(CLOSE, 1) - LOW))
  return MA(TR, N)`,
    dependencies: ['MAX', 'ABS', 'REF', 'MA'],
  },
  {
    name: 'BBI',
    description: 'BBI多空指标',
    code: `from .MA import MA # 依赖MA函数
def BBI(CLOSE,M1=3,M2=6,M3=12,M4=20): #BBI多空指标   
  return (MA(CLOSE,M1)+MA(CLOSE,M2)+MA(CLOSE,M3)+MA(CLOSE,M4))/4`,
    dependencies: ['MA'],
  },
  {
    name: 'DMI',
    description: '动向指标：结果和同花顺，通达信完全一致',
    code: `from .SUM import SUM # 依赖SUM函数
from .MAX import MAX # 依赖MAX函数
from .ABS import ABS # 依赖ABS函数
from .REF import REF # 依赖REF函数
from .IF import IF # 依赖IF函数
from .MA import MA # 依赖MA函数
def DMI(CLOSE,HIGH,LOW,M1=14,M2=6): #动向指标：结果和同花顺，通达信完全一致
  TR = SUM(MAX(MAX(HIGH - LOW, ABS(HIGH - REF(CLOSE, 1))), ABS(LOW - REF(CLOSE, 1))), M1)
  HD = HIGH - REF(HIGH, 1);     LD = REF(LOW, 1) - LOW
  DMP = SUM(IF((HD > 0) & (HD > LD), HD, 0), M1)
  DMM = SUM(IF((LD > 0) & (LD > HD), LD, 0), M1)
  PDI = DMP * 100 / TR;         MDI = DMM * 100 / TR
  ADX = MA(ABS(MDI - PDI) / (PDI + MDI) * 100, M2)
  ADXR = (ADX + REF(ADX, M2)) / 2
  return PDI, MDI, ADX, ADXR`,
    dependencies: ['SUM', 'MAX', 'ABS', 'REF', 'IF', 'MA'],
  },
  {
    name: 'TAQ',
    description: '唐安奇通道(海龟)交易指标，大道至简，能穿越牛熊',
    code: `from .HHV import HHV # 依赖HHV函数
from .LLV import LLV # 依赖LLV函数
def TAQ(HIGH,LOW,N): #唐安奇通道(海龟)交易指标，大道至简，能穿越牛熊
  UP=HHV(HIGH,N);    DOWN=LLV(LOW,N);    MID=(UP+DOWN)/2
  return UP,MID,DOWN`,
    dependencies: ['HHV', 'LLV'],
  },
  {
    name: 'KTN',
    description: '肯特纳交易通道, N选20日，ATR选10日',
    code: `from .EMA import EMA # 依赖EMA函数
from .ATR import ATR # 依赖ATR函数
def KTN(CLOSE,HIGH,LOW,N=20,M=10): #肯特纳交易通道, N选20日，ATR选10日
  MID=EMA((HIGH+LOW+CLOSE)/3,N)
  ATRN=ATR(CLOSE,HIGH,LOW,M)
  UPPER=MID+2*ATRN;   LOWER=MID-2*ATRN
  return UPPER,MID,LOWER`,
    dependencies: ['EMA', 'ATR'],
  },
  {
    name: 'TRIX',
    description: '三重指数平滑平均线',
    code: `from .EMA import EMA # 依赖EMA函数
from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
def TRIX(CLOSE,M1=12, M2=20): #三重指数平滑平均线
  TR = EMA(EMA(EMA(CLOSE, M1), M1), M1)
  TRIX_VAL = (TR - REF(TR, 1)) / REF(TR, 1) * 100 # 变量名TRIX与函数名TRIX冲突，修改为TRIX_VAL
  TRMA = MA(TRIX_VAL, M2)
  return TRIX_VAL, TRMA`,
    dependencies: ['EMA', 'REF', 'MA'],
  },
  {
    name: 'VR',
    description: 'VR容量比率',
    code: `from .REF import REF # 依赖REF函数
from .SUM import SUM # 依赖SUM函数
from .IF import IF # 依赖IF函数
def VR(CLOSE,VOL,M1=26): #VR容量比率
  LC = REF(CLOSE, 1)
  return SUM(IF(CLOSE > LC, VOL, 0), M1) / SUM(IF(CLOSE <= LC, VOL, 0), M1) * 100`,
    dependencies: ['REF', 'SUM', 'IF'],
  },
  {
    name: 'CR',
    description: 'CR价格动量指标',
    code: `from .REF import REF # 依赖REF函数
from .SUM import SUM # 依赖SUM函数
from .MAX import MAX # 依赖MAX函数
def CR(CLOSE,HIGH,LOW,N=20): #CR价格动量指标
  MID=REF(HIGH+LOW+CLOSE,1)/3;
  return SUM(MAX(0,HIGH-MID),N)/SUM(MAX(0,MID-LOW),N)*100`,
    dependencies: ['REF', 'SUM', 'MAX'],
  },
  {
    name: 'EMV',
    description: '简易波动指标',
    code: `from .MA import MA # 依赖MA函数
from .REF import REF # 依赖REF函数
def EMV(HIGH,LOW,VOL,N=14,M=9): #简易波动指标 
    VOLUME=MA(VOL,N)/VOL;       MID=100*(HIGH+LOW-REF(HIGH+LOW,1))/(HIGH+LOW)
    EMV_VAL=MA(MID*VOLUME*(HIGH-LOW)/MA(HIGH-LOW,N),N);    MAEMV=MA(EMV_VAL,M) # 变量名EMV与函数名EMV冲突，修改为EMV_VAL
    return EMV_VAL,MAEMV`,
    dependencies: ['MA', 'REF'],
  },
  {
    name: 'DPO',
    description: '区间震荡线',
    code: `from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
def DPO(CLOSE,M1=20, M2=10, M3=6): #区间震荡线
  DPO_VAL = CLOSE - REF(MA(CLOSE, M1), M2);    MADPO = MA(DPO_VAL, M3) # 变量名DPO与函数名DPO冲突，修改为DPO_VAL
  return DPO_VAL, MADPO`,
    dependencies: ['REF', 'MA'],
  },
  {
    name: 'BRAR',
    description: 'BRAR-ARBR 情绪指标',
    code: `from .SUM import SUM # 依赖SUM函数
from .MAX import MAX # 依赖MAX函数
from .REF import REF # 依赖REF函数
def BRAR(OPEN,CLOSE,HIGH,LOW,M1=26): #BRAR-ARBR 情绪指标  
    AR = SUM(HIGH - OPEN, M1) / SUM(OPEN - LOW, M1) * 100
    BR = SUM(MAX(0, HIGH - REF(CLOSE, 1)), M1) / SUM(MAX(0, REF(CLOSE, 1) - LOW), M1) * 100
    return AR, BR`,
    dependencies: ['SUM', 'MAX', 'REF'],
  },
  {
    name: 'DFMA',
    description: '平行线差指标',
    code: `from .MA import MA # 依赖MA函数
def DFMA(CLOSE,N1=10,N2=50,M=10): #平行线差指标 #通达信指标叫DMA 同花顺叫新DMA
  DIF=MA(CLOSE,N1)-MA(CLOSE,N2); DIFMA=MA(DIF,M)
  return DIF,DIFMA`,
    dependencies: ['MA'],
  },
  {
    name: 'MTM',
    description: '动量指标',
    code: `from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
def MTM(CLOSE,N=12,M=6): #动量指标
  MTM_VAL=CLOSE-REF(CLOSE,N);         MTMMA=MA(MTM_VAL,M) # 变量名MTM与函数名MTM冲突，修改为MTM_VAL
  return MTM_VAL,MTMMA`,
    dependencies: ['REF', 'MA'],
  },
  {
    name: 'MASS',
    description: '梅斯线',
    code: `from .SUM import SUM # 依赖SUM函数
from .MA import MA # 依赖MA函数
def MASS(HIGH,LOW,N1=9,N2=25,M=6): #梅斯线
  MASS_VAL=SUM(MA(HIGH-LOW,N1)/MA(MA(HIGH-LOW,N1),N1),N2) # 变量名MASS与函数名MASS冲突，修改为MASS_VAL
  MA_MASS=MA(MASS_VAL,M)
  return MASS_VAL,MA_MASS`,
    dependencies: ['SUM', 'MA'],
  },
  {
    name: 'ROC',
    description: '变动率指标',
    code: `from .REF import REF # 依赖REF函数
from .MA import MA # 依赖MA函数
def ROC(CLOSE,N=12,M=6): #变动率指标
  ROC_VAL=100*(CLOSE-REF(CLOSE,N))/REF(CLOSE,N);    MAROC=MA(ROC_VAL,M) # 变量名ROC与函数名ROC冲突，修改为ROC_VAL
  return ROC_VAL,MAROC`,
    dependencies: ['REF', 'MA'],
  },
  {
    name: 'EXPMA',
    description: 'EMA指数平均数指标',
    code: `from .EMA import EMA # 依赖EMA函数
def EXPMA(CLOSE,N1=12,N2=50): #EMA指数平均数指标
  return EMA(CLOSE,N1),EMA(CLOSE,N2);`,
    dependencies: ['EMA'],
  },
  {
    name: 'OBV',
    description: '能量潮指标',
    code: `from .SUM import SUM # 依赖SUM函数
from .IF import IF # 依赖IF函数
from .REF import REF # 依赖REF函数
def OBV(CLOSE,VOL): #能量潮指标
  return SUM(IF(CLOSE>REF(CLOSE,1),VOL,IF(CLOSE<REF(CLOSE,1),-VOL,0)),0)/10000`,
    dependencies: ['SUM', 'IF', 'REF'],
  },
  {
    name: 'MFI',
    description: 'MFI指标是成交量的RSI指标',
    code: `from .SUM import SUM # 依赖SUM函数
from .IF import IF # 依赖IF函数
from .REF import REF # 依赖REF函数
def MFI(CLOSE,HIGH,LOW,VOL,N=14): #MFI指标是成交量的RSI指标
  TYP = (HIGH + LOW + CLOSE)/3
  V1=SUM(IF(TYP>REF(TYP,1),TYP*VOL,0),N)/SUM(IF(TYP<REF(TYP,1),TYP*VOL,0),N)  
  return 100-(100/(1+V1))`,
    dependencies: ['SUM', 'IF', 'REF'],
  },
  {
    name: 'ASI',
    description: '振动升降指标',
    code: `from .REF import REF # 依赖REF函数
from .ABS import ABS # 依赖ABS函数
from .IF import IF # 依赖IF函数
from .MAX import MAX # 依赖MAX函数
from .SUM import SUM # 依赖SUM函数
from .MA import MA # 依赖MA函数
def ASI(OPEN,CLOSE,HIGH,LOW,M1=26,M2=10): #振动升降指标
  LC=REF(CLOSE,1);      AA=ABS(HIGH-LC);     BB=ABS(LOW-LC);
  CC=ABS(HIGH-REF(LOW,1));   DD=ABS(LC-REF(OPEN,1));
  R=IF( (AA>BB) & (AA>CC),AA+BB/2+DD/4,IF( (BB>CC) & (BB>AA),BB+AA/2+DD/4,CC+DD/4));
  X=(CLOSE-LC+(CLOSE-OPEN)/2+LC-REF(OPEN,1));
  SI=16*X/R*MAX(AA,BB);   ASI_VAL=SUM(SI,M1);   ASIT=MA(ASI_VAL,M2); # 变量名ASI与函数名ASI冲突，修改为ASI_VAL
  return ASI_VAL,ASIT`,
    dependencies: ['REF', 'ABS', 'IF', 'MAX', 'SUM', 'MA'],
  },
  {
    name: 'XSII',
    description: '薛斯通道II',
    code: `from .MA import MA # 依赖MA函数
from .ABS import ABS # 依赖ABS函数
from .DMA import DMA # 依赖DMA函数
def XSII(CLOSE, HIGH, LOW, N=102, M=7): #薛斯通道II  
    AA  = MA((2*CLOSE + HIGH + LOW)/4, 5)            #最新版DMA才支持 2021-12-4
    TD1 = AA*N/100;   TD2 = AA*(200-N) / 100
    CC =  ABS((2*CLOSE + HIGH + LOW)/4 - MA(CLOSE,20))/MA(CLOSE,20)
    DD =  DMA(CLOSE,CC);    TD3=(1+M/100)*DD;      TD4=(1-M/100)*DD
    return TD1, TD2, TD3, TD4`,
    dependencies: ['MA', 'ABS', 'DMA'],
  },
];


function createNodeFromBaseFunction(def: BaseFunctionDef): Node {
  const nodeId = `basefunc_${def.name}`; // 保持原始ID格式
  const parsed = parsePythonFunction(def.code);

  const inputs: Port[] = parsed.inputs.map((inputName, i) => {
    const sanitizedInputName = inputName.replace(/[^a-zA-Z0-9_]/g, '') || `param${i}`;
    return {
      id: `port_in_${nodeId}_${sanitizedInputName}_idx${i}`, // 使用索引确保静态ID
      name: inputName,
      originalName: inputName,
      type: 'input',
      nodeId: nodeId,
    };
  });

  const outputs: Port[] = parsed.outputs.map((outputName, i) => {
    const sanitizedOutputName = outputName.replace(/[^a-zA-Z0-9_]/g, '') || `output${i + 1}`;
    return {
      id: `port_out_${nodeId}_${sanitizedOutputName}_idx${i}`, // 使用索引确保静态ID
      name: outputName,
      originalName: outputName,
      type: 'output',
      nodeId: nodeId,
    };
  });
  
  let importStatements = '';
  const addedImports = new Set<string>();

  // 检查代码中是否实际使用了np.或pd.
  const usesNumpy = /np\./.test(def.code);
  const usesPandas = /pd\./.test(def.code);

  // 首先处理显式声明的依赖
  if (def.dependencies) {
    def.dependencies.forEach(dep => {
      const lowerDep = dep.toLowerCase();
      if (lowerDep === 'numpy' && !addedImports.has('numpy')) {
        importStatements += 'import numpy as np\n';
        addedImports.add('numpy');
      } else if (lowerDep === 'pandas' && !addedImports.has('pandas')) {
        importStatements += 'import pandas as pd\n';
        addedImports.add('pandas');
      } else if (!['numpy', 'pandas'].includes(lowerDep) && !addedImports.has(dep)) {
        // 假设自定义依赖是其他基础函数
        importStatements += `from .${dep} import ${dep}\n`; 
        addedImports.add(dep);
      }
    });
  }

  // 如果代码中使用了np但未通过dependencies添加，则补充
  if (usesNumpy && !addedImports.has('numpy')) {
    importStatements += 'import numpy as np\n';
    addedImports.add('numpy');
  }
  // 如果代码中使用了pd但未通过dependencies添加，则补充
  if (usesPandas && !addedImports.has('pandas')) {
    importStatements += 'import pandas as pd\n';
    addedImports.add('pandas');
  }
  
  // 从原始代码中移除已经通过上面逻辑添加的导入语句
  let processedCode = def.code;
  processedCode = processedCode.replace(/^import\s+numpy\s+as\s+np\s*(\r\n|\n|\r)?/gm, '');
  processedCode = processedCode.replace(/^import\s+pandas\s+as\s+pd\s*(\r\n|\n|\r)?/gm, '');
  // 移除形如 from .XXX import XXX 的导入语句
  processedCode = processedCode.replace(/^from\s+\.(.*?)\s+import\s+\1\s*(\r\n|\n|\r)?/gm, ''); 
  
  // 移除代码末尾可能存在的分号和空白
  processedCode = processedCode.replace(/;\s*$/, '').trim();

  const finalCode = (importStatements + processedCode).trim();


  return {
    id: nodeId, 
    type: 'python-function',
    name: def.name,
    position: { x: 0, y: 0 }, 
    inputs,
    outputs,
    data: {
      code: finalCode,
      description: def.description,
      templateId: `base_${def.name}`, // 用于区分这是基础函数模板
    },
  };
}

export const baseFunctions: Node[] = rawBaseFunctions.map(createNodeFromBaseFunction);
