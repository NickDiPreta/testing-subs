import * as nexus from '@nexus/schema'
import { nexusPrisma } from 'nexus-plugin-prisma'
import { join } from 'path'
import { Context } from './types'



const status = nexus.objectType({
  name: "status",
  definition(t){
    t.model.status()
    t.model.location()
    t.model.recorded_at()
  }
},
)

export const Query = nexus.queryType({
  definition(t) {
    t.crud.status()
  },
})

export const Mutation = nexus.mutationType({
  definition(t) {
    t.field('createStatus', {
      type: 'status',
      args: {
        status: nexus.intArg(),
        location: nexus.stringArg({ nullable: true })
      },
      resolve: async (_parent, { status, location }, ctx) => {
        const newStatus = await ctx.prisma.status.create({
          data: {
            status,
            location,
            recorded_at: new Date()
          },
        })

        // publish the subscription here
        ctx.pubsub.publish('latestStatus', newStatus)
        return newStatus
      },
    })
  },
})

export const Subscription = nexus.subscriptionField('latestStatus', {
  type: 'status',
  subscribe(_root, _args, ctx) {
    return ctx.pubsub.asyncIterator('latestStatus')
  },
  resolve(payload) {
    return payload
  },
})

export const schema = nexus.makeSchema({
  types: [status, Query, Mutation, Subscription],
  plugins: [
    nexusPrisma({
      experimentalCRUD: true,
      prismaClient: (ctx: Context) => ctx.prisma,
    }),
  ],
  outputs: {
    typegen: join(__dirname, 'generated', 'index.d.ts'),
    schema: join(__dirname, 'generated', 'schema.graphql'),
  },
  typegenAutoConfig: {
    sources: [
      {
        source: '@prisma/client',
        alias: 'prisma',
      },
      {
        source: join(__dirname, 'types.ts'),
        alias: 'ctx',
      },
    ],
    contextType: 'ctx.Context',
  },
})
