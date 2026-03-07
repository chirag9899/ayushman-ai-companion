module.exports = function (api) {
  const isExpoAutolinking = api.caller((caller) => {
    const name = caller && typeof caller.name === 'string' ? caller.name : ''
    return name.includes('expo-modules-autolinking')
  })
  api.cache.using(() => (isExpoAutolinking ? 'autolinking' : 'default'))

  return {
    presets: [
      'babel-preset-expo',
      !isExpoAutolinking && 'nativewind/babel',
    ].filter(Boolean),
    ignore: [/react-native\.config\.js$/],
    plugins: [],
  }
}
