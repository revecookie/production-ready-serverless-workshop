const DocumentClient = require('aws-sdk/clients/dynamodb').DocumentClient
const Log = require('@dazn/lambda-powertools-logger')
const dynamodb = new DocumentClient()
const XRay = require('aws-xray-sdk-core')
XRay.captureAWSClient(dynamodb.service)
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const ssm = require('@middy/ssm')

const { serviceName, stage } = process.env
const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  Log.debug('Finding restaurants with theme', { count, theme })
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: { ":theme": theme }
  }

  const resp = await dynamodb.scan(req).promise()
  Log.debug('Found numbre of restaurants', resp.Items.length )
  return resp.Items
}

module.exports.handler = wrap(async (event, context) => {
  const req = JSON.parse(event.body)
  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(theme, context.config.defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }
  console.info(context.secretString)

  return response
}).use(ssm({
  cache: true,
  cacheExpiry: 1 * 60 * 1000, // 1 mins
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${stage}/search-restaurants/config`,
    secretString: `/${serviceName}/${stage}/search-restaurants/secretString`
  }
}))