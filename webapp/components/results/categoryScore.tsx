import { Badge, Container, Group, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import React from 'react'


interface CategoryScoreProps {
    name: string
    score: number
    color?: string
}

const CategoryScore: React.FC<CategoryScoreProps> = ({name, score, color}) => {
    const matches = useMediaQuery('(min-aspect-ratio:1/1)')
    return (
        <Container size='lg'>
            <Group direction='column' position='center' spacing='xs'>
                <Text size={matches ? 'lg' : 'sm'}>{name}</Text>
                <Badge
                radius='sm'
                size={matches ? 'xl' : 'lg'} 
                variant='gradient'
                gradient={{
                    from: 'lime',
                    to: 'green'
                }}>
                    מקום #{score}
                </Badge>
            </Group>
        </Container>
    )
}

export default CategoryScore