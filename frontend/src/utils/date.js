export function formatDateTime(input) {
  if (!input) return '';
  const value = String(input);
  // 处理 ISO 字符串，裁剪小数秒，替换 T 为空格
  if (value.includes('T')) {
    const [datePart, timePartRaw] = value.split('T');
    const timePart = (timePartRaw || '').split('.')[0];
    if (datePart && timePart) return `${datePart} ${timePart}`;
  }
  // 已有空格分隔的日期时间，裁剪小数秒
  if (value.includes(' ')) {
    return value.split('.')[0];
  }
  // 其他情况尝试用 Date 解析并本地化
  const d = new Date(value);
  if (!isNaN(d)) {
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  // 兜底：原样返回（避免显示为空）
  return value;
} 