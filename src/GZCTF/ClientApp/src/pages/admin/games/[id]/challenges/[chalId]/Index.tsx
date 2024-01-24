import {
  Button,
  Grid,
  Group,
  Input,
  NumberInput,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { showNotification } from '@mantine/notifications'
import {
  mdiCheck,
  mdiContentSaveOutline,
  mdiDatabaseEditOutline,
  mdiDeleteOutline,
  mdiEyeOutline,
  mdiKeyboardBackspace,
} from '@mdi/js'
import { Icon } from '@mdi/react'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import HintList from '@Components/HintList'
import InstanceEntry from '@Components/InstanceEntry'
import ChallengePreviewModal from '@Components/admin/ChallengePreviewModal'
import ScoreFunc from '@Components/admin/ScoreFunc'
import { SwitchLabel } from '@Components/admin/SwitchLabel'
import WithGameEditTab from '@Components/admin/WithGameEditTab'
import { showErrorNotification } from '@Utils/ApiErrorHandler'
import {
  ChallengeTagItem,
  useChallengeTagLabelMap,
  ChallengeTypeItem,
  useChallengeTypeLabelMap,
} from '@Utils/Shared'
import { OnceSWRConfig } from '@Utils/useConfig'
import { useEditChallenge } from '@Utils/useEdit'
import api, { ChallengeTag, ChallengeType, ChallengeUpdateModel, FileType } from '@Api'

const GameChallengeEdit: FC = () => {
  const navigate = useNavigate()
  const { id, chalId } = useParams()
  const [numId, numCId] = [parseInt(id ?? '-1'), parseInt(chalId ?? '-1')]

  const { challenge, mutate } = useEditChallenge(numId, numCId)

  const { data: chals, mutate: mutateChals } = api.edit.useEditGetGameChallenges(
    numId,
    OnceSWRConfig
  )

  const [challengeInfo, setChallengeInfo] = useState<ChallengeUpdateModel>({ ...challenge })
  const [disabled, setDisabled] = useState(false)

  const [minRate, setMinRate] = useState((challenge?.minScoreRate ?? 0.25) * 100)
  const [tag, setTag] = useState<string | null>(challenge?.tag ?? ChallengeTag.Misc)
  const [type, setType] = useState<string | null>(challenge?.type ?? ChallengeType.StaticAttachment)
  const [currentAcceptCount, setCurrentAcceptCount] = useState(0)
  const [previewOpend, setPreviewOpend] = useState(false)

  const modals = useModals()
  const challengeTypeLabelMap = useChallengeTypeLabelMap()
  const challengeTagLabelMap = useChallengeTagLabelMap()

  const { t } = useTranslation()

  useEffect(() => {
    if (challenge) {
      setChallengeInfo({ ...challenge })
      setTag(challenge.tag)
      setType(challenge.type)
      setMinRate((challenge?.minScoreRate ?? 0.25) * 100)
      setCurrentAcceptCount(challenge.acceptedCount)
    }
  }, [challenge])

  const onUpdate = (challenge: ChallengeUpdateModel, noFeedback?: boolean) => {
    if (!challenge) return

    setDisabled(true)
    return api.edit
      .editUpdateGameChallenge(numId, numCId, {
        ...challenge,
        isEnabled: undefined,
      })
      .then((data) => {
        if (!noFeedback) {
          showNotification({
            color: 'teal',
            message: t('admin.notification.games.challenges.updated'),
            icon: <Icon path={mdiCheck} size={1} />,
          })
        }
        mutate(data.data)
        mutateChals()
      })
      .catch((e) => showErrorNotification(e, t))
      .finally(() => {
        if (!noFeedback) {
          setDisabled(false)
        }
      })
  }

  const onConfirmDelete = () => {
    api.edit
      .editRemoveGameChallenge(numId, numCId)
      .then(() => {
        showNotification({
          color: 'teal',
          message: t('admin.notification.games.challenges.deleted'),
          icon: <Icon path={mdiCheck} size={1} />,
        })
        mutateChals(
          chals?.filter((chal) => chal.id !== numCId),
          { revalidate: false }
        )
        navigate(`/admin/games/${id}/challenges`)
      })
      .catch((e) => showErrorNotification(e, t))
      .finally(() => {
        setDisabled(false)
      })
  }

  const onCreateTestContainer = () => {
    api.edit
      .editCreateTestContainer(numId, numCId)
      .then((res) => {
        showNotification({
          color: 'teal',
          message: t('admin.notification.games.instances.created'),
          icon: <Icon path={mdiCheck} size={1} />,
        })
        if (challenge) mutate({ ...challenge, testContainer: res.data })
      })
      .catch((e) => showErrorNotification(e, t))
      .finally(() => {
        setDisabled(false)
      })
  }

  const onDestroyTestContainer = () => {
    api.edit
      .editDestroyTestContainer(numId, numCId)
      .then(() => {
        showNotification({
          color: 'teal',
          message: t('admin.notification.games.instances.deleted'),
          icon: <Icon path={mdiCheck} size={1} />,
        })
        if (challenge) mutate({ ...challenge, testContainer: undefined })
      })
      .catch((e) => showErrorNotification(e, t))
      .finally(() => {
        setDisabled(false)
      })
  }

  const onToggleTestContainer = () => {
    if (!challenge) return

    setDisabled(true)
    onUpdate(
      {
        ...challengeInfo,
        tag: tag as ChallengeTag,
        minScoreRate: minRate / 100,
      },
      true
    )?.then(challenge?.testContainer ? onDestroyTestContainer : onCreateTestContainer)
  }

  return (
    <WithGameEditTab
      isLoading={!challenge}
      headProps={{ position: 'apart' }}
      head={
        <>
          <Group noWrap position="left">
            <Button
              leftIcon={<Icon path={mdiKeyboardBackspace} size={1} />}
              onClick={() => navigate(`/admin/games/${id}/challenges`)}
            >
              {t('admin.button.back')}
            </Button>
            <Title lineClamp={1} style={{ wordBreak: 'break-all' }}>
              # {challengeInfo?.title}
            </Title>
          </Group>
          <Group noWrap position="right">
            <Button
              disabled={disabled}
              color="red"
              leftIcon={<Icon path={mdiDeleteOutline} size={1} />}
              variant="outline"
              onClick={() =>
                modals.openConfirmModal({
                  title: t('admin.button.challenges.delete'),
                  children: (
                    <Text size="sm">
                      {t('admin.content.games.challenges.delete', {
                        name: challengeInfo?.title,
                      })}
                    </Text>
                  ),
                  onConfirm: () => onConfirmDelete(),
                  confirmProps: { color: 'red' },
                })
              }
            >
              {t('admin.button.challenges.delete')}
            </Button>
            <Button
              disabled={disabled}
              leftIcon={<Icon path={mdiEyeOutline} size={1} />}
              onClick={() => setPreviewOpend(true)}
            >
              {t('admin.button.challenges.preview')}
            </Button>
            <Button
              disabled={disabled}
              leftIcon={<Icon path={mdiDatabaseEditOutline} size={1} />}
              onClick={() => navigate(`/admin/games/${numId}/challenges/${numCId}/flags`)}
            >
              {t('admin.button.challenges.edit_more')}
            </Button>
            <Button
              disabled={disabled}
              leftIcon={<Icon path={mdiContentSaveOutline} size={1} />}
              onClick={() =>
                onUpdate({
                  ...challengeInfo,
                  tag: tag as ChallengeTag,
                  minScoreRate: minRate / 100,
                })
              }
            >
              {t('admin.button.save')}
            </Button>
          </Group>
        </>
      }
    >
      <Stack>
        <Grid columns={3}>
          <Grid.Col span={1}>
            <TextInput
              label={t('admin.content.games.challenges.title')}
              disabled={disabled}
              value={challengeInfo.title ?? ''}
              required
              onChange={(e) => setChallengeInfo({ ...challengeInfo, title: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={1}>
            <Select
              label={
                <Group spacing="sm">
                  <Text size="sm">{t('admin.content.games.challenges.type.label')}</Text>
                  <Text size="xs" c="dimmed">
                    {t('admin.content.games.challenges.type.description')}
                  </Text>
                </Group>
              }
              placeholder="Type"
              value={type}
              disabled={disabled}
              readOnly
              itemComponent={ChallengeTypeItem}
              data={Object.entries(ChallengeType).map((type) => {
                const data = challengeTypeLabelMap.get(type[1])
                return { value: type[1], ...data }
              })}
            />
          </Grid.Col>
          <Grid.Col span={1}>
            <Select
              required
              label={t('admin.content.games.challenges.tag')}
              placeholder="Tag"
              value={tag}
              disabled={disabled}
              onChange={(e) => {
                setTag(e)
                setChallengeInfo({ ...challengeInfo, tag: e as ChallengeTag })
              }}
              itemComponent={ChallengeTagItem}
              data={Object.entries(ChallengeTag).map((tag) => {
                const data = challengeTagLabelMap.get(tag[1])
                return { value: tag[1], ...data }
              })}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Textarea
              w="100%"
              label={
                <Group spacing="sm">
                  <Text size="sm">{t('admin.content.games.challenges.description')}</Text>
                  <Text size="xs" c="dimmed">
                    {t('admin.content.markdown_support')}
                  </Text>
                </Group>
              }
              value={challengeInfo?.content ?? ''}
              autosize
              disabled={disabled}
              minRows={5}
              maxRows={5}
              onChange={(e) => setChallengeInfo({ ...challengeInfo, content: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={1}>
            <Stack spacing="sm">
              <HintList
                label={
                  <Group spacing="sm">
                    <Text size="sm">{t('admin.content.games.challenges.hints')}</Text>
                    <Text size="xs" c="dimmed">
                      {t('admin.content.markdown_inline_support')}
                    </Text>
                  </Group>
                }
                hints={challengeInfo?.hints ?? []}
                disabled={disabled}
                height={180}
                onChangeHint={(hints) => setChallengeInfo({ ...challengeInfo, hints })}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={1}>
            <Stack spacing="sm">
              <NumberInput
                label={t('admin.content.games.challenges.original_score')}
                min={0}
                required
                disabled={disabled}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                value={challengeInfo?.originalScore ?? 500}
                onChange={(e) =>
                  e !== '' && setChallengeInfo({ ...challengeInfo, originalScore: e })
                }
              />
              <NumberInput
                label={t('admin.content.games.challenges.difficulty')}
                precision={1}
                step={0.2}
                min={0.1}
                required
                disabled={disabled}
                value={challengeInfo?.difficulty ?? 100}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                onChange={(e) => e !== '' && setChallengeInfo({ ...challengeInfo, difficulty: e })}
              />
              <Input.Wrapper
                label={t('admin.content.games.challenges.min_score_radio.label')}
                required
              >
                <Slider
                  label={(value) =>
                    t('admin.content.games.challenges.min_score_radio.description', {
                      min_score: ((value / 100) * (challengeInfo?.originalScore ?? 500)).toFixed(0),
                    })
                  }
                  disabled={disabled}
                  value={minRate}
                  marks={[
                    { value: 20, label: '20%' },
                    { value: 50, label: '50%' },
                    { value: 80, label: '80%' },
                  ]}
                  onChange={setMinRate}
                  styles={(theme) => ({
                    label: {
                      background:
                        theme.colorScheme === 'dark' ? theme.colors.dark[4] : 'rgba(0, 0, 0, 0.8)',
                    },
                  })}
                />
              </Input.Wrapper>
            </Stack>
          </Grid.Col>
          <Grid.Col span={1}>
            <ScoreFunc
              currentAcceptCount={currentAcceptCount}
              originalScore={challengeInfo.originalScore ?? 500}
              minScoreRate={minRate / 100}
              difficulty={challengeInfo.difficulty ?? 30}
            />
          </Grid.Col>
        </Grid>
        {type === ChallengeType.DynamicAttachment && (
          <TextInput
            label={t('admin.content.games.challenges.attachment_name.label')}
            description={t('admin.content.games.challenges.attachment_name.description')}
            disabled={disabled}
            value={challengeInfo.fileName ?? 'attachment'}
            onChange={(e) => setChallengeInfo({ ...challengeInfo, fileName: e.target.value })}
          />
        )}
        {(type === ChallengeType.StaticContainer || type === ChallengeType.DynamicContainer) && (
          <Grid columns={12}>
            <Grid.Col span={8}>
              <TextInput
                label={t('admin.content.games.challenges.container_image')}
                disabled={disabled}
                value={challengeInfo.containerImage ?? ''}
                required
                rightSectionWidth={122}
                rightSection={
                  <Button
                    color={challenge?.testContainer ? 'orange' : 'brand'}
                    disabled={disabled}
                    onClick={onToggleTestContainer}
                  >
                    {challenge?.testContainer
                      ? t('admin.button.challenges.test_container.destroy')
                      : t('admin.button.challenges.test_container.create')}
                  </Button>
                }
                onChange={(e) =>
                  setChallengeInfo({ ...challengeInfo, containerImage: e.target.value })
                }
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <InstanceEntry
                test
                disabled={disabled}
                context={{
                  closeTime: challenge?.testContainer?.expectStopAt,
                  instanceEntry: challenge?.testContainer?.entry,
                }}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label={t('admin.content.games.challenges.service_port.label')}
                description={t('admin.content.games.challenges.service_port.description')}
                min={1}
                max={65535}
                required
                disabled={disabled}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                value={challengeInfo.containerExposePort ?? 1}
                onChange={(e) =>
                  e !== '' && setChallengeInfo({ ...challengeInfo, containerExposePort: e })
                }
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label={t('admin.content.games.challenges.cpu_limit.label')}
                description={t('admin.content.games.challenges.cpu_limit.description')}
                min={1}
                max={1024}
                required
                disabled={disabled}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                value={challengeInfo.cpuCount ?? 1}
                onChange={(e) => e !== '' && setChallengeInfo({ ...challengeInfo, cpuCount: e })}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label={t('admin.content.games.challenges.memory_limit.label')}
                description={t('admin.content.games.challenges.memory_limit.description')}
                min={32}
                max={1048576}
                required
                disabled={disabled}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                value={challengeInfo.memoryLimit ?? 32}
                onChange={(e) => e !== '' && setChallengeInfo({ ...challengeInfo, memoryLimit: e })}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label={t('admin.content.games.challenges.storage_limit.label')}
                description={t('admin.content.games.challenges.storage_limit.description')}
                min={128}
                max={1048576}
                required
                disabled={disabled}
                stepHoldDelay={500}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
                value={challengeInfo.storageLimit ?? 128}
                onChange={(e) =>
                  e !== '' && setChallengeInfo({ ...challengeInfo, storageLimit: e })
                }
              />
            </Grid.Col>
            <Grid.Col span={4} style={{ alignItems: 'center', display: 'flex' }}>
              <Switch
                disabled={disabled}
                checked={challengeInfo.enableTrafficCapture ?? false}
                label={SwitchLabel(
                  t('admin.content.games.challenges.traffic_capture.label'),
                  t('admin.content.games.challenges.traffic_capture.description')
                )}
                onChange={(e) =>
                  setChallengeInfo({ ...challengeInfo, enableTrafficCapture: e.target.checked })
                }
              />
            </Grid.Col>
          </Grid>
        )}
      </Stack>
      <ChallengePreviewModal
        challenge={challengeInfo}
        opened={previewOpend}
        onClose={() => setPreviewOpend(false)}
        withCloseButton={false}
        size="40%"
        type={challenge?.type ?? ChallengeType.StaticAttachment}
        tagData={
          challengeTagLabelMap.get((challengeInfo?.tag as ChallengeTag) ?? ChallengeTag.Misc)!
        }
        attachmentType={challenge?.attachment?.type ?? FileType.None}
      />
    </WithGameEditTab>
  )
}

export default GameChallengeEdit
